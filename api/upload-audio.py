from http.server import BaseHTTPRequestHandler
import json
import os

# Try to import vercel_blob, but handle gracefully if not available
try:
    from vercel_blob import handle_upload
    BLOB_AVAILABLE = True
    print("✅ vercel_blob package imported successfully in upload-audio")
except ImportError as e:
    print(f"❌ Failed to import vercel_blob in upload-audio: {e}")
    BLOB_AVAILABLE = False
    handle_upload = None

# Maximum file size: 50MB
MAX_FILE_SIZE = 50 * 1024 * 1024

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-vercel-signature')
        self.end_headers()

    def do_POST(self):
        try:
            # Check if blob storage is available
            if not BLOB_AVAILABLE:
                self.send_error_response(503, 
                    'Blob storage not available (vercel_blob package not imported). '
                    'Blob storage is required for audio uploads.')
                return
            
            # Check for required environment variable
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            if not blob_token:
                print("ERROR: BLOB_READ_WRITE_TOKEN environment variable is missing")
                self.send_error_response(500, "BLOB_READ_WRITE_TOKEN environment variable is required")
                return
            
            # Parse request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Parse JSON request
            try:
                data = json.loads(post_data.decode('utf-8'))
            except:
                # If not JSON, might be a blob upload callback
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True}).encode('utf-8'))
                return
            
            # Get request parameters
            filename = data.get('pathname', data.get('filename', 'uploaded-audio.mp3'))
            file_type = data.get('type', 'audio/mpeg')
            
            # Validate file type
            if not filename.lower().endswith('.mp3') and file_type != 'audio/mpeg':
                self.send_error_response(400, 'Only MP3 files are supported')
                return
            
            # Handle the upload request using vercel_blob
            try:
                # The handle_upload function generates a client upload token
                result = handle_upload(
                    body=data,
                    request={
                        'headers': dict(self.headers),
                        'url': f"https://{self.headers.get('host', 'localhost')}{self.path}"
                    },
                    token=blob_token,
                    on_before_generate_token=lambda pathname, client_payload: {
                        'allowedContentTypes': ['audio/mpeg', 'audio/mp3'],
                        'maximumSizeInBytes': MAX_FILE_SIZE,
                    }
                )
                
                # Send the response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-vercel-signature')
                self.end_headers()
                
                # Convert result to JSON if it's not already a string
                if isinstance(result, str):
                    self.wfile.write(result.encode('utf-8'))
                else:
                    self.wfile.write(json.dumps(result).encode('utf-8'))
                return
                
            except Exception as e:
                print(f"❌ Failed to handle upload: {str(e)}")
                self.send_error_response(500, f'Failed to handle upload: {str(e)}')
                return
                
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")
            self.send_error_response(500, f'An unexpected error occurred: {str(e)}')
    
    def do_GET(self):
        self.send_error_response(405, 'Method not allowed. Use POST for uploads.')
    
    def send_error_response(self, status_code: int, message: str):
        response = {
            'success': False,
            'error': message
        }
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-vercel-signature')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode('utf-8'))
