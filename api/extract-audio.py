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

def get_video_info(url: str, cookies_content: str = None) -> dict:
    """Extract video information using yt-dlp with optional cookies support"""
    
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
    
    # Strategy 1: High-quality MP3 with cookies (if provided) - No FFmpeg post-processing
    ydl_opts_cookies = {
        'format': 'bestaudio[abr>=192][ext=mp3]/bestaudio[abr>=128][ext=mp3]/bestaudio[ext=mp3]/bestaudio[abr>=192]/bestaudio[ext=m4a]/bestaudio/best',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'cookiefile': cookies_file.name if cookies_file else None,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    }
    
    # Strategy 2: High-quality MP3 standard configuration - No FFmpeg post-processing
    ydl_opts_standard = {
        'format': 'bestaudio[abr>=192][ext=mp3]/bestaudio[abr>=128][ext=mp3]/bestaudio[ext=mp3]/bestaudio[abr>=192]/bestaudio[ext=m4a]/bestaudio',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    }
    
    # Strategy 3: Minimal configuration (fallback) - No FFmpeg post-processing
    ydl_opts_minimal = {
        'format': 'bestaudio[ext=mp3]/bestaudio[ext=m4a]/bestaudio/worst',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'ignore_errors': True,
    }
    
    # Build strategies list - prioritize high-quality MP3
    strategies = []
    if cookies_file:
        strategies.append(("cookies_hq_mp3", ydl_opts_cookies))
    strategies.extend([
        ("standard_hq_mp3", ydl_opts_standard),
        ("minimal_mp3", ydl_opts_minimal)
    ])
    
    last_error = None
    
    for strategy_name, ydl_opts in strategies:
        try:
            print(f"Trying strategy: {strategy_name}")
            
            # Add delay between strategies
            if strategy_name != "minimal_mp3":
                time.sleep(random.uniform(2, 4))
                
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # Find the best available audio format, preferring MP3 and high bitrate
                audio_url = None
                selected_format = None
                
                if 'formats' in info and info['formats']:
                    print(f"Found {len(info['formats'])} formats to analyze")
                    
                    # Sort formats by preference: MP3 first, then by bitrate
                    audio_formats = []
                    for fmt in info['formats']:
                        if fmt.get('acodec') and fmt.get('acodec') != 'none' and fmt.get('url'):
                            audio_formats.append(fmt)
                    
                    print(f"Found {len(audio_formats)} audio formats")
                    
                    # Prioritize formats: MP3 with high bitrate first
                    def format_priority(fmt):
                        ext = fmt.get('ext', '')
                        abr = fmt.get('abr', 0) or 0
                        
                        # MP3 gets highest priority
                        if ext == 'mp3':
                            return (3, abr)  # High priority, then by bitrate
                        # M4A gets medium priority
                        elif ext == 'm4a':
                            return (2, abr)
                        # Other audio formats get lower priority
                        else:
                            return (1, abr)
                    
                    # Sort by priority (descending)
                    audio_formats.sort(key=format_priority, reverse=True)
                    
                    # Select the best format
                    if audio_formats:
                        selected_format = audio_formats[0]
                        audio_url = selected_format.get('url')
                        
                        ext = selected_format.get('ext', 'unknown')
                        abr = selected_format.get('abr', 'unknown')
                        acodec = selected_format.get('acodec', 'unknown')
                        
                        print(f"✅ Selected best audio format:")
                        print(f"   Format: {ext}")
                        print(f"   Bitrate: {abr}kbps")
                        print(f"   Codec: {acodec}")
                        print(f"   Strategy: {strategy_name}")
                
                # Final fallback to direct URL
                if not audio_url and info.get('url'):
                    audio_url = info['url']
                    print("⚠️ Using direct URL fallback")
                    
                if audio_url:
                    return {
                        'title': info.get('title', 'Unknown Title'),
                        'duration': info.get('duration', 0),
                        'audio_url': audio_url
                    }
                    
        except Exception as e:
            last_error = e
            error_msg = str(e).lower()
            
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
        raise Exception("Failed to extract video information using all available methods.")

def download_audio(audio_url: str) -> bytes:
    """Download audio from URL"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/'
    }
    
    try:
        response = requests.get(audio_url, headers=headers, timeout=120)
        response.raise_for_status()
        
        # Log file size for debugging (no limit since we use blob storage)
        content_length = response.headers.get('content-length')
        if content_length:
            size_mb = int(content_length) / (1024 * 1024)
            print(f"Downloading YouTube audio: {size_mb:.2f}MB")
        
        return response.content
    except requests.RequestException as e:
        raise Exception(f"Failed to download audio: {str(e)}")

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
            
            if not youtube_url:
                self.send_error_response(400, 'YouTube URL is required')
                return
            
            # Validate URL
            if not validate_youtube_url(youtube_url):
                self.send_error_response(400, 'Please provide a valid YouTube URL')
                return
            
            # Get video info
            try:
                video_info = get_video_info(youtube_url, cookies_content)
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
            
            # Log duration for monitoring (no limits since we use blob storage)
            duration_minutes = video_info['duration'] / 60
            print(f"YouTube video duration: {duration_minutes:.1f} minutes")
            
            # Note: Blob storage can handle audio files of any length
            
            # Download audio
            if not video_info['audio_url']:
                self.send_error_response(400, 'No audio stream available for this video')
                return
            
            try:
                audio_data = download_audio(video_info['audio_url'])
                audio_size_mb = len(audio_data) / (1024 * 1024)
                print(f"Downloaded YouTube audio: {audio_size_mb:.2f}MB")
                
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
                    blob_url = self._upload_to_blob_storage(audio_data, video_info['title'])
                    response = {
                        'audioUrl': blob_url,
                        'duration': video_info['duration'],
                        'title': video_info['title'],
                        'success': True,
                        'deliveryMethod': 'blob',
                        'audioSize': f'{audio_size_mb:.2f}MB'
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
    
    def _upload_to_blob_storage(self, audio_content: bytes, title: str) -> str:
        """Upload audio content to Vercel Blob storage and return the URL"""
        
        if not BLOB_AVAILABLE:
            raise Exception("vercel_blob package not available")
            
        try:
            # Check for required environment variable
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            if not blob_token:
                print("ERROR: BLOB_READ_WRITE_TOKEN environment variable is missing")
                raise Exception("BLOB_READ_WRITE_TOKEN environment variable is required")
            
            # Create a unique filename based on content hash and timestamp
            content_hash = hashlib.sha256(audio_content).hexdigest()[:12]
            timestamp = int(time.time())
            # Sanitize title for filename
            safe_title = re.sub(r'[^\w\-_\.]', '_', title)[:50]
            filename = f"youtube-audio/{safe_title}/{timestamp}-{content_hash}.mp3"
            
            print(f"Uploading YouTube audio to blob storage: {filename}")
            
            # Upload to Vercel Blob
            blob_result = vercel_blob.put(
                filename,
                audio_content,
                {
                    'addRandomSuffix': 'true',
                    'contentType': 'audio/mpeg'
                }
            )
            
            print(f"✅ YouTube audio blob upload successful!")
            
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