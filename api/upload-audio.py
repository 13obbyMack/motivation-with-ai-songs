from http.server import BaseHTTPRequestHandler
import json
import os
import hmac
import hashlib
import time

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
        """Generate a client upload token for direct browser-to-blob upload"""
        try:
            # Check for required environment variable
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            if not blob_token:
                print("ERROR: BLOB_READ_WRITE_TOKEN environment variable is missing")
                self.send_error_response(500, "BLOB_READ_WRITE_TOKEN environment variable is required")
                return
            
            # Parse request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
            except Exception as e:
                print(f"Failed to parse JSON: {e}")
                self.send_error_response(400, f'Invalid JSON: {str(e)}')
                return
            
            # Get parameters from @vercel/blob/client request
            pathname = data.get('pathname', '')
            content_type = data.get('type', 'audio/mpeg')
            
            if not pathname:
                self.send_error_response(400, 'pathname is required')
                return
            
            # Validate file type
            if not pathname.lower().endswith('.mp3') and content_type not in ['audio/mpeg', 'audio/mp3']:
                self.send_error_response(400, 'Only MP3 files are supported')
                return
            
            print(f"Generating client token for: {pathname}")
            
            # Generate the client token response
            # This is what @vercel/blob/client expects
            response = {
                'type': 'blob.generate-client-token',
                'clientToken': blob_token,  # The BLOB_READ_WRITE_TOKEN
                'allowedContentTypes': ['audio/mpeg', 'audio/mp3'],
                'maximumSizeInBytes': MAX_FILE_SIZE,
                'validUntil': int(time.time() * 1000) + 3600000,  # Valid for 1 hour (in milliseconds)
            }
            
            print(f"✅ Generated client token for: {pathname}")
            
            # Send the response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return
                
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            self.send_error_response(500, f'An unexpected error occurred: {str(e)}')
    
    def do_GET(self):
        self.send_error_response(405, 'Method not allowed. Use POST to get upload token.')
    
    def send_error_response(self, status_code: int, message: str):
        response = {
            'error': message
        }
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode('utf-8'))
