from http.server import BaseHTTPRequestHandler
import json
import base64
import re
import time
import random
import tempfile
import os
import hashlib
import yt_dlp
import requests

# Try to import vercel_blob, but handle gracefully if not available
try:
    import vercel_blob
    BLOB_AVAILABLE = True
    print("✅ vercel_blob package imported successfully in extract-audio")
except ImportError as e:
    print(f"❌ Failed to import vercel_blob in extract-audio: {e}")
    BLOB_AVAILABLE = False
    vercel_blob = None

# YouTube URL validation regex
YOUTUBE_URL_REGEX = re.compile(
    r'^(https?://)?(www\.)?(youtube\.com/(watch\?v=|embed/|v/)|youtu\.be/)([a-zA-Z0-9_-]{11})(\S*)?$'
)

def validate_youtube_url(url: str) -> bool:
    """Validate YouTube URL format"""
    return bool(YOUTUBE_URL_REGEX.match(url.strip()))

def download_youtube_audio(url: str, output_path: str, cookies_content: str = None) -> dict:
    """Download audio from YouTube using yt-dlp with optional cookies support"""
    
    # Create temporary cookies file if cookies provided
    cookies_file = None
    if cookies_content:
        try:
            # Validate cookies format
            if not cookies_content.strip().startswith(('# HTTP Cookie File', '# Netscape HTTP Cookie File')):
                # Add proper header if missing
                cookies_content = '# Netscape HTTP Cookie File\n' + cookies_content.strip()
            
            # Create temporary file for cookies
            cookies_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
            cookies_file.write(cookies_content)
            cookies_file.close()
        except Exception as e:
            if cookies_file:
                try:
                    os.unlink(cookies_file.name)
                except:
                    pass
            raise Exception(f"Invalid cookies format: {str(e)}")
    
    # Base options for all strategies
    base_opts = {
        'outtmpl': output_path,
        'noplaylist': True,
        'quiet': False,
        'no_warnings': False,
        'extract_flat': False,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    }
    
    # Strategy 1: Best audio quality with cookies (if provided)
    ydl_opts_cookies = {
        **base_opts,
        'format': 'bestaudio/best',
        'cookiefile': cookies_file.name if cookies_file else None,
    }
    
    # Strategy 2: Best audio quality standard configuration
    ydl_opts_standard = {
        **base_opts,
        'format': 'bestaudio/best',
    }
    
    # Strategy 3: Minimal configuration (fallback)
    ydl_opts_minimal = {
        **base_opts,
        'format': 'worst',
        'ignore_errors': True,
    }
    
    # Build strategies list
    strategies = []
    if cookies_file:
        strategies.append(("cookies_best_audio", ydl_opts_cookies))
    strategies.extend([
        ("standard_best_audio", ydl_opts_standard),
        ("minimal_fallback", ydl_opts_minimal)
    ])
    
    last_error = None
    video_info = None
    
    for strategy_name, ydl_opts in strategies:
        try:
            print(f"Trying download strategy: {strategy_name}")
            
            # Add delay between strategies
            if strategy_name != "minimal_fallback":
                time.sleep(random.uniform(1, 2))
                
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Download the audio file directly
                info = ydl.extract_info(url, download=True)
                
                if info and os.path.exists(output_path):
                    file_size = os.path.getsize(output_path)
                    size_mb = file_size / (1024 * 1024)
                    
                    print(f"✅ Successfully downloaded audio:")
                    print(f"   Strategy: {strategy_name}")
                    print(f"   File size: {size_mb:.2f}MB")
                    print(f"   Duration: {info.get('duration', 0)}s")
                    
                    video_info = {
                        'title': info.get('title', 'Unknown Title'),
                        'duration': info.get('duration', 0),
                        'file_path': output_path,
                        'file_size': file_size
                    }
                    break
                    
        except Exception as e:
            last_error = e
            error_msg = str(e).lower()
            print(f"⚠️ Strategy {strategy_name} failed: {str(e)}")
            
            # If it's a JSON parsing error or player response error, try next strategy
            if any(phrase in error_msg for phrase in ['json', 'player response', 'initial data']):
                continue
            # If it's a bot detection error, stop trying
            elif any(phrase in error_msg for phrase in ['sign in', 'bot', 'captcha']):
                break
            # For other errors, continue to next strategy
            else:
                continue
    
    # Cleanup cookies file
    if cookies_file:
        try:
            os.unlink(cookies_file.name)
        except:
            pass
    
    # Check if download succeeded
    if video_info:
        return video_info
    
    # All strategies failed
    if last_error:
        error_msg = str(last_error).lower()
        
        if any(phrase in error_msg for phrase in ['json', 'player response', 'initial data']):
            if not cookies_content:
                raise Exception("YouTube is blocking requests. Try uploading your YouTube cookies file in the API configuration to bypass this restriction.")
            else:
                raise Exception("YouTube extraction failed even with cookies. The cookies may be expired or invalid. Please export fresh cookies from your browser.")
        elif any(phrase in error_msg for phrase in ['sign in', 'bot', 'captcha']):
            if not cookies_content:
                raise Exception("YouTube requires authentication. Please upload your YouTube cookies file in the API configuration section to access this video.")
            else:
                raise Exception("YouTube authentication failed. Your cookies may be expired. Please export fresh cookies from your browser and try again.")
        elif 'private' in error_msg or 'unavailable' in error_msg:
            raise Exception("This video is private, unavailable, or restricted. Please use a public video.")
        else:
            if not cookies_content:
                raise Exception(f"YouTube extraction failed. Try uploading your YouTube cookies file in the API configuration. Error: {str(last_error)}")
            else:
                raise Exception(f"YouTube extraction failed even with cookies. Error: {str(last_error)}")
    else:
        raise Exception("Failed to download audio using all available methods.")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            youtube_url = data.get('youtubeUrl')
            cookies_content = data.get('youtubeCookies')
            session_id = data.get('sessionId')
            
            if not youtube_url:
                self.send_error_response(400, 'YouTube URL is required')
                return
            
            if not session_id:
                self.send_error_response(400, 'Session ID is required')
                return
            
            # Validate URL
            if not validate_youtube_url(youtube_url):
                self.send_error_response(400, 'Please provide a valid YouTube URL')
                return
            
            # Download audio using yt-dlp
            try:
                # Create temp file for download
                with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
                    temp_audio_path = temp_file.name
                
                video_info = download_youtube_audio(youtube_url, temp_audio_path, cookies_content)
                
                # Read the downloaded file
                with open(temp_audio_path, 'rb') as f:
                    audio_data = f.read()
                
                # Clean up temp file
                try:
                    os.unlink(temp_audio_path)
                except:
                    pass
                
                audio_size_mb = len(audio_data) / (1024 * 1024)
                duration_minutes = video_info['duration'] / 60
                
                print(f"✅ YouTube audio downloaded successfully:")
                print(f"   Duration: {duration_minutes:.1f} minutes")
                print(f"   Size: {audio_size_mb:.2f}MB")
                
            except Exception as e:
                error_msg = str(e)
                
                # Check for specific YouTube errors
                if any(phrase in error_msg.lower() for phrase in ['sign in', 'bot', 'captcha', 'json', 'player response']):
                    self.send_error_response(429, 
                        'YouTube is blocking automated requests from this server (common with cloud functions). '
                        'Solutions: 1) Try a different YouTube video (popular music videos work better), '
                        '2) Wait 15-30 minutes and retry, 3) Use official artist channels, '
                        '4) Consider uploading an audio file directly instead. '
                        'This is a YouTube limitation, not an app issue.')
                    return
                elif 'Private video' in error_msg or 'unavailable' in error_msg.lower():
                    self.send_error_response(400, 
                        'This video is private, unavailable, or restricted. Please use a public video.')
                    return
                elif 'age-restricted' in error_msg.lower():
                    self.send_error_response(400, 
                        'This video is age-restricted and cannot be processed. Please use a different video.')
                    return
                else:
                    self.send_error_response(400, f'Failed to process video: {error_msg}')
                    return
            
            # Upload to blob storage
            try:
                
                # BLOB STORAGE ONLY - No fallback logic
                print(f"YouTube audio extracted: {audio_size_mb:.2f}MB")
                print(f"BLOB_AVAILABLE: {BLOB_AVAILABLE}")
                
                # Check if blob storage is available
                if not BLOB_AVAILABLE:
                    self.send_error_response(503, 
                        f'Blob storage not available (vercel_blob package not imported). '
                        f'YouTube audio size: {audio_size_mb:.1f}MB. '
                        f'Blob storage is required for all audio processing.')
                    return
                
                # Upload to blob storage (ONLY method)
                try:
                    print(f"Uploading {audio_size_mb:.2f}MB YouTube audio to blob storage")
                    blob_url = self._upload_to_blob_storage(audio_data, video_info['title'], session_id)
                    response = {
                        'audioUrl': blob_url,
                        'duration': video_info['duration'],
                        'title': video_info['title'],
                        'success': True,
                        'deliveryMethod': 'blob',
                        'audioSize': f'{audio_size_mb:.2f}MB',
                        'sessionId': session_id
                    }
                    self.send_json_response(200, response)
                    return
                    
                except Exception as blob_error:
                    print(f"❌ Blob storage failed for YouTube audio: {str(blob_error)}")
                    
                    # No fallback - blob storage is required
                    self.send_error_response(503, 
                        f'Blob storage failed: {str(blob_error)}. '
                        f'YouTube audio size: {audio_size_mb:.1f}MB. '
                        f'Blob storage is required for all audio processing.')
                    return
                
            except Exception as e:
                self.send_error_response(500, str(e))
                return
                
        except Exception as e:
            self.send_error_response(500, f'An unexpected error occurred: {str(e)}')
    
    def _upload_to_blob_storage(self, audio_content: bytes, title: str, session_id: str) -> str:
        """Upload audio content to Vercel Blob storage with session-based folder structure"""
        
        if not BLOB_AVAILABLE:
            raise Exception("vercel_blob package not available")
            
        try:
            # Check for required environment variable
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            if not blob_token:
                print("ERROR: BLOB_READ_WRITE_TOKEN environment variable is missing")
                raise Exception("BLOB_READ_WRITE_TOKEN environment variable is required")
            
            # Create a unique filename with session-based folder structure
            content_hash = hashlib.sha256(audio_content).hexdigest()[:12]
            timestamp = int(time.time())
            # Sanitize title for filename
            safe_title = re.sub(r'[^\w\-_\.]', '_', title)[:50]
            filename = f"youtube-audio/{session_id}/{safe_title}-{timestamp}-{content_hash}.mp3"
            
            print(f"Uploading YouTube audio to session folder: {filename}")
            
            # Upload to Vercel Blob
            blob_result = vercel_blob.put(
                filename,
                audio_content,
                {
                    'addRandomSuffix': 'true',
                    'contentType': 'audio/mpeg'
                }
            )
            
            print(f"✅ YouTube audio blob upload successful to session {session_id}!")
            
            # Extract URL from result
            if isinstance(blob_result, dict):
                url = blob_result.get('url') or blob_result.get('downloadUrl')
            else:
                url = getattr(blob_result, 'url', None) or getattr(blob_result, 'downloadUrl', None)
            
            if not url:
                raise Exception("Blob upload succeeded but no URL was returned")
                
            return url
            
        except Exception as e:
            error_msg = str(e)
            if "token" in error_msg.lower():
                raise Exception("Invalid or missing BLOB_READ_WRITE_TOKEN")
            else:
                raise Exception(f"Blob storage upload failed: {error_msg}")

    def do_GET(self):
        self.send_error_response(405, 'Method not allowed. Use POST to extract audio.')
    
    def send_json_response(self, status_code: int, data: dict):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def send_error_response(self, status_code: int, message: str):
        response = {
            'audioUrl': '',
            'duration': 0,
            'title': '',
            'success': False,
            'error': message,
            'deliveryMethod': 'error'
        }
        self.send_json_response(status_code, response)