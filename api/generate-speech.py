from http.server import BaseHTTPRequestHandler
import json
import base64
import requests
import time
import os
import hashlib
from typing import Dict, Any

# Try to import vercel_blob, but handle gracefully if not available
try:
    import vercel_blob
    BLOB_AVAILABLE = True
    print("✅ vercel_blob package imported successfully")
except ImportError as e:
    print(f"❌ Failed to import vercel_blob: {e}")
    BLOB_AVAILABLE = False
    vercel_blob = None

# ElevenLabs model configurations
ELEVENLABS_MODELS = {
    'eleven_multilingual_v2': {'limit': 10000, 'quality': 'high'},
    'eleven_flash_v2_5': {'limit': 40000, 'quality': 'fast'},
    'eleven_turbo_v2_5': {'limit': 40000, 'quality': 'balanced'},
    'eleven_v3': {'limit': 10000, 'quality': 'expressive'}
}

# TTS Settings for motivational content
MOTIVATIONAL_TTS_SETTINGS = {
    'stability': 0.3,
    'similarity_boost': 0.85,
    'style': 0.0,
    'use_speaker_boost': True
}

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            # Validate Content-Length header
            if 'Content-Length' not in self.headers:
                self.send_error_response(400, 'Missing Content-Length header')
                return
            
            try:
                content_length = int(self.headers['Content-Length'])
            except ValueError:
                self.send_error_response(400, 'Invalid Content-Length header')
                return
            
            # Log request size for monitoring (no limits since we use blob storage)
            request_size_mb = content_length / (1024 * 1024)
            print(f"Request body size: {request_size_mb:.2f}MB")
            
            # Parse request body with timeout protection
            try:
                post_data = self.rfile.read(content_length)
                if len(post_data) != content_length:
                    self.send_error_response(400, 'Incomplete request body received')
                    return
                
                data = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError as e:
                self.send_error_response(400, f'Invalid JSON in request body: {str(e)}')
                return
            except UnicodeDecodeError:
                self.send_error_response(400, 'Invalid UTF-8 encoding in request body')
                return
            
            # Validate required fields with specific error messages
            api_key = data.get('apiKey')
            text = data.get('text')
            voice_id = data.get('voiceId')
            settings = data.get('settings', {})
            model_id = data.get('modelId', 'eleven_multilingual_v2')
            output_format = data.get('outputFormat', 'mp3_44100_128')
            
            # Detailed validation with specific error messages
            if not api_key:
                self.send_error_response(400, 'Missing required field: apiKey')
                return
            if not isinstance(api_key, str) or len(api_key.strip()) == 0:
                self.send_error_response(400, 'API key must be a non-empty string')
                return
            
            if not text:
                self.send_error_response(400, 'Missing required field: text')
                return
            if not isinstance(text, str) or len(text.strip()) == 0:
                self.send_error_response(400, 'Text must be a non-empty string')
                return
            
            if not voice_id:
                self.send_error_response(400, 'Missing required field: voiceId')
                return
            if not isinstance(voice_id, str) or len(voice_id.strip()) == 0:
                self.send_error_response(400, 'Voice ID must be a non-empty string')
                return
            
            # Validate model_id
            if model_id not in ELEVENLABS_MODELS:
                available_models = ', '.join(ELEVENLABS_MODELS.keys())
                self.send_error_response(400, f'Invalid model_id. Available models: {available_models}')
                return
            
            # Validate settings structure
            if not isinstance(settings, dict):
                self.send_error_response(400, 'Settings must be a JSON object')
                return
            
            # Log text length for monitoring (no limits since we use blob storage)
            print(f"Processing text: {len(text)} characters")
            
            # Note: ElevenLabs model limits are handled by the frontend chunking system
            # We don't enforce limits here since blob storage handles any audio size
            
            # Merge settings with defaults
            tts_settings = {**MOTIVATIONAL_TTS_SETTINGS, **settings}
            
            # Make request to ElevenLabs
            headers = {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': api_key
            }
            
            payload = {
                'text': text,
                'model_id': model_id,
                'voice_settings': tts_settings,
                'output_format': output_format
            }
            
            try:
                # Make request with retry logic for transient failures
                max_retries = 2
                retry_delay = 1
                
                for attempt in range(max_retries + 1):
                    try:
                        response = requests.post(
                            f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}',
                            headers=headers,
                            json=payload,
                            timeout=90  # Generous timeout for blob storage processing
                        )
                        break  # Success, exit retry loop
                    except requests.exceptions.Timeout:
                        if attempt < max_retries:
                            time.sleep(retry_delay)
                            retry_delay *= 2  # Exponential backoff
                            continue
                        else:
                            self.send_error_response(408, 'Request timeout. ElevenLabs API is taking too long to respond')
                            return
                    except requests.exceptions.ConnectionError:
                        if attempt < max_retries:
                            time.sleep(retry_delay)
                            retry_delay *= 2
                            continue
                        else:
                            self.send_error_response(503, 'Unable to connect to ElevenLabs API. Please try again later')
                            return
                
                # Enhanced error handling for ElevenLabs API responses
                if not response.ok:
                    error_details = self._parse_elevenlabs_error(response)
                    self.send_error_response(response.status_code, error_details['message'])
                    return
                
                # Check if we have audio content
                if not response.content:
                    self.send_error_response(500, 'ElevenLabs returned empty audio content')
                    return
                
                audio_size_mb = len(response.content) / (1024 * 1024)
                print(f"Generated audio file: {audio_size_mb:.2f}MB")
                
                # BLOB STORAGE ONLY - No fallback logic
                print(f"BLOB_AVAILABLE: {BLOB_AVAILABLE}")
                print(f"vercel_blob module: {vercel_blob}")
                print(f"Uploading {audio_size_mb:.2f}MB audio file to blob storage")
                
                # Check if blob storage is available
                if not BLOB_AVAILABLE:
                    self.send_error_response(503, 
                        f'Blob storage not available (vercel_blob package not imported). '
                        f'Audio file size: {audio_size_mb:.1f}MB. '
                        f'Blob storage is required for all audio processing.')
                    return
                
                # Upload to blob storage (ONLY method)
                try:
                    blob_url = self._upload_to_blob_storage(response.content, voice_id, text)
                    response_data = {
                        'audioUrl': blob_url,
                        'success': True,
                        'deliveryMethod': 'blob',
                        'audioSize': f'{audio_size_mb:.2f}MB',
                        'expiresIn': '24 hours'
                    }
                    self.send_json_response(200, response_data)
                    return
                    
                except Exception as blob_error:
                    print(f"❌ Blob storage failed: {str(blob_error)}")
                    print(f"Blob error type: {type(blob_error)}")
                    
                    # No fallback - blob storage is required
                    self.send_error_response(503, 
                        f'Blob storage failed: {str(blob_error)}. '
                        f'Audio file size: {audio_size_mb:.1f}MB. '
                        f'Blob storage is required for all audio processing.')
                    return
                
            except requests.exceptions.RequestException as e:
                error_type = type(e).__name__
                self.send_error_response(500, f'Network error ({error_type}): {str(e)}')
                return
            except Exception as e:
                self.send_error_response(500, f'Unexpected error during API request: {str(e)}')
                return
                
        except MemoryError:
            self.send_error_response(507, 'Insufficient memory to process request. Try shorter text')
        except Exception as e:
            # Log the full error for debugging while sending a safe message to client
            error_type = type(e).__name__
            self.send_error_response(500, f'Internal server error ({error_type}). Please try again')
    
    def _upload_to_blob_storage(self, audio_content: bytes, voice_id: str, text: str) -> str:
        """Upload audio content to Vercel Blob storage and return the URL"""
        
        print(f"🔍 _upload_to_blob_storage called")
        print(f"🔍 BLOB_AVAILABLE: {BLOB_AVAILABLE}")
        print(f"🔍 vercel_blob: {vercel_blob}")
        
        if not BLOB_AVAILABLE:
            raise Exception("vercel_blob package not available")
            
        try:
            # Check for required environment variable
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            if not blob_token:
                print("❌ ERROR: BLOB_READ_WRITE_TOKEN environment variable is missing")
                print("Please set this in your Vercel project environment variables")
                raise Exception("BLOB_READ_WRITE_TOKEN environment variable is required")
            
            print(f"✅ Found blob token: {blob_token[:10]}...")
            
            # Create a unique filename based on content hash and timestamp
            content_hash = hashlib.sha256(audio_content).hexdigest()[:12]
            timestamp = int(time.time())
            filename = f"tts-audio/{voice_id}/{timestamp}-{content_hash}.mp3"
            
            print(f"📁 Uploading to blob storage: {filename}")
            print(f"📊 File size: {len(audio_content):,} bytes ({len(audio_content)/(1024*1024):.2f}MB)")
            
            # Check if vercel_blob has the put function
            if not hasattr(vercel_blob, 'put'):
                print(f"❌ vercel_blob.put function not found!")
                print(f"Available functions: {[attr for attr in dir(vercel_blob) if not attr.startswith('_')]}")
                raise Exception("vercel_blob.put function not available")
            
            print(f"✅ vercel_blob.put function found: {vercel_blob.put}")
            
            # Upload to Vercel Blob
            print("🚀 Starting blob upload...")
            blob_result = vercel_blob.put(
                filename,
                audio_content,
                {
                    'addRandomSuffix': 'true',
                    'contentType': 'audio/mpeg'
                }
            )
            
            print(f"✅ Blob upload completed!")
            print(f"📋 Result type: {type(blob_result)}")
            print(f"📋 Result: {blob_result}")
            
            # Extract URL from result
            url = None
            if isinstance(blob_result, dict):
                url = blob_result.get('url') or blob_result.get('downloadUrl')
                print(f"🔗 Found URL in dict: {url}")
            else:
                url = getattr(blob_result, 'url', None) or getattr(blob_result, 'downloadUrl', None)
                print(f"🔗 Found URL in object: {url}")
            
            if not url:
                print(f"❌ No URL found in blob result!")
                print(f"Full result: {blob_result}")
                raise Exception("Blob upload succeeded but no URL was returned")
                
            print(f"🎉 Success! Blob URL: {url}")
            return url
            
        except Exception as e:
            error_msg = str(e)
            print(f"💥 Blob storage error: {error_msg}")
            print(f"💥 Error type: {type(e)}")
            
            # Re-raise with more context
            raise Exception(f"Blob storage failed: {error_msg}")
    
    def _parse_elevenlabs_error(self, response) -> Dict[str, Any]:
        """Parse ElevenLabs API error response for detailed error information"""
        try:
            error_data = response.json()
            detail = error_data.get('detail', {})
            
            if response.status_code == 401:
                return {'message': 'Invalid or expired ElevenLabs API key'}
            elif response.status_code == 402:
                return {'message': 'Insufficient quota. Please check your ElevenLabs account balance'}
            elif response.status_code == 422:
                if isinstance(detail, dict):
                    if 'voice_id' in str(detail).lower():
                        return {'message': 'Invalid voice ID. Please check the voice ID is correct'}
                    elif 'model' in str(detail).lower():
                        return {'message': 'Invalid model specified'}
                return {'message': f'Invalid request parameters: {detail}'}
            elif response.status_code == 429:
                return {'message': 'Rate limit exceeded. Please wait before making another request'}
            elif response.status_code == 500:
                return {'message': 'ElevenLabs server error. Please try again later'}
            elif response.status_code == 503:
                return {'message': 'ElevenLabs service temporarily unavailable'}
            else:
                return {'message': f'ElevenLabs API error (HTTP {response.status_code}): {detail}'}
                
        except (json.JSONDecodeError, AttributeError):
            return {'message': f'ElevenLabs API error (HTTP {response.status_code})'}
    
    def send_json_response(self, status_code: int, data: dict):
        try:
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            json_data = json.dumps(data).encode('utf-8')
            self.wfile.write(json_data)
        except Exception as e:
            # Fallback error response if JSON serialization fails
            try:
                error_response = json.dumps({
                    'audioData': '',
                    'success': False,
                    'error': 'Failed to serialize response data'
                }).encode('utf-8')
                self.wfile.write(error_response)
            except:
                pass  # If even this fails, there's nothing more we can do
    
    def send_error_response(self, status_code: int, message: str):
        """Send a standardized error response with enhanced error information"""
        
        # Add helpful context for blob storage issues
        if "BLOB_READ_WRITE_TOKEN" in message:
            message += " Go to your Vercel project settings > Environment Variables and add BLOB_READ_WRITE_TOKEN from your Vercel Blob store."
        
        response = {
            'audioUrl': '',
            'success': False,
            'error': message,
            'timestamp': int(time.time()),
            'statusCode': status_code,
            'deliveryMethod': 'error'
        }
        self.send_json_response(status_code, response)