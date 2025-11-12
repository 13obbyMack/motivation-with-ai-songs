from http.server import BaseHTTPRequestHandler
import json
import base64
import time
import hashlib
import os
import tempfile

# Try to import vercel_blob, but handle gracefully if not available
try:
    import vercel_blob
    BLOB_AVAILABLE = True
    print("✅ vercel_blob package imported successfully in upload-audio")
except ImportError as e:
    print(f"❌ Failed to import vercel_blob in upload-audio: {e}")
    BLOB_AVAILABLE = False
    vercel_blob = None

# Maximum file size: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024

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
            
            # Check file size before reading
            if content_length > MAX_FILE_SIZE:
                self.send_error_response(413, 
                    f'File too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024):.0f}MB')
                return
            
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            audio_base64 = data.get('audioData')
            filename = data.get('filename', 'uploaded-audio.mp3')
            session_id = data.get('sessionId')
            
            if not audio_base64:
                self.send_error_response(400, 'Audio data is required')
                return
            
            if not session_id:
                self.send_error_response(400, 'Session ID is required')
                return
            
            # Decode base64 audio data
            try:
                audio_data = base64.b64decode(audio_base64)
            except Exception as e:
                self.send_error_response(400, f'Invalid base64 audio data: {str(e)}')
                return
            
            audio_size_mb = len(audio_data) / (1024 * 1024)
            
            # Verify we have actual audio data
            if len(audio_data) < 1024:
                self.send_error_response(400, 
                    f'Uploaded audio file is too small ({len(audio_data)} bytes). '
                    'Please upload a valid MP3 file.')
                return
            
            # Validate MP3 format (check for MP3 header)
            if not self._is_valid_mp3(audio_data):
                self.send_error_response(400, 
                    'Invalid MP3 file. Please upload a valid MP3 audio file.')
                return
            
            print(f"✅ Custom audio uploaded successfully:")
            print(f"   Filename: {filename}")
            print(f"   Size: {audio_size_mb:.2f}MB")
            
            # Upload to blob storage
            try:
                print(f"Custom audio uploaded: {audio_size_mb:.2f}MB")
                print(f"BLOB_AVAILABLE: {BLOB_AVAILABLE}")
                
                # Check if blob storage is available
                if not BLOB_AVAILABLE:
                    self.send_error_response(503, 
                        f'Blob storage not available (vercel_blob package not imported). '
                        f'Custom audio size: {audio_size_mb:.1f}MB. '
                        f'Blob storage is required for all audio processing.')
                    return
                
                # Upload to blob storage (ONLY method)
                try:
                    print(f"Uploading {audio_size_mb:.2f}MB custom audio to blob storage")
                    blob_url = self._upload_to_blob_storage(audio_data, filename, session_id)
                    response = {
                        'audioUrl': blob_url,
                        'duration': 0,  # Duration will be calculated during processing
                        'title': filename,
                        'success': True,
                        'deliveryMethod': 'blob',
                        'audioSize': f'{audio_size_mb:.2f}MB',
                        'sessionId': session_id
                    }
                    self.send_json_response(200, response)
                    return
                    
                except Exception as blob_error:
                    print(f"❌ Blob storage failed for custom audio: {str(blob_error)}")
                    
                    # No fallback - blob storage is required
                    self.send_error_response(503, 
                        f'Blob storage failed: {str(blob_error)}. '
                        f'Custom audio size: {audio_size_mb:.1f}MB. '
                        f'Blob storage is required for all audio processing.')
                    return
                
            except Exception as e:
                self.send_error_response(500, str(e))
                return
                
        except Exception as e:
            self.send_error_response(500, f'An unexpected error occurred: {str(e)}')
    
    def _is_valid_mp3(self, audio_data: bytes) -> bool:
        """Validate MP3 file format by checking for MP3 headers"""
        if len(audio_data) < 3:
            return False
        
        # Check for ID3 tag (ID3v2)
        if audio_data[:3] == b'ID3':
            return True
        
        # Check for MP3 frame sync (0xFF 0xFB, 0xFF 0xFA, 0xFF 0xF3, 0xFF 0xF2)
        if len(audio_data) >= 2:
            if audio_data[0] == 0xFF and (audio_data[1] & 0xE0) == 0xE0:
                return True
        
        return False
    
    def _upload_to_blob_storage(self, audio_content: bytes, filename: str, session_id: str) -> str:
        """Upload audio content to Vercel Blob storage with session-based folder structure"""
        
        if not BLOB_AVAILABLE:
            raise Exception("vercel_blob package not available")
        
        # Validate audio content
        if not audio_content or len(audio_content) == 0:
            raise Exception("Cannot upload empty audio content to blob storage")
        
        content_size_mb = len(audio_content) / (1024 * 1024)
        print(f"Preparing to upload {content_size_mb:.2f}MB to blob storage")
            
        try:
            # Check for required environment variable
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            if not blob_token:
                print("ERROR: BLOB_READ_WRITE_TOKEN environment variable is missing")
                raise Exception("BLOB_READ_WRITE_TOKEN environment variable is required")
            
            # Create a unique filename with session-based folder structure
            content_hash = hashlib.sha256(audio_content).hexdigest()[:12]
            timestamp = int(time.time())
            # Sanitize filename
            safe_filename = filename.replace(' ', '_').replace('/', '_')[:50]
            blob_filename = f"custom-audio/{session_id}/{safe_filename}-{timestamp}-{content_hash}.mp3"
            
            print(f"Uploading custom audio to session folder: {blob_filename} ({content_size_mb:.2f}MB)")
            
            # Upload to Vercel Blob
            blob_result = vercel_blob.put(
                blob_filename,
                audio_content,
                {
                    'addRandomSuffix': 'true',
                    'contentType': 'audio/mpeg'
                }
            )
            
            print(f"✅ Custom audio blob upload successful to session {session_id}!")
            
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
        self.send_error_response(405, 'Method not allowed. Use POST to upload audio.')
    
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
