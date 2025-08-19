from http.server import BaseHTTPRequestHandler
import json
import os
import time

# Try to import vercel_blob, but handle gracefully if not available
try:
    import vercel_blob
    BLOB_AVAILABLE = True
except ImportError as e:
    BLOB_AVAILABLE = False
    vercel_blob = None

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        try:
            # Check if blob package is available
            if not BLOB_AVAILABLE:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': False,
                    'error': 'vercel_blob package not available',
                    'details': 'The vercel_blob Python package is not installed or not available in this environment',
                    'hasToken': False,
                    'canUpload': False
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return
            
            # Check environment variable
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            if not blob_token:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': False,
                    'error': 'BLOB_READ_WRITE_TOKEN environment variable not found',
                    'details': 'Please set BLOB_READ_WRITE_TOKEN in your Vercel project environment variables',
                    'hasToken': False,
                    'canUpload': False
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return

            # Test upload
            try:
                test_content = b"Test blob storage upload"
                test_filename = f"test-{int(time.time())}.txt"
                
                result = vercel_blob.put(
                    test_filename,
                    test_content,
                    {
                        'addRandomSuffix': 'true',
                        'contentType': 'text/plain'
                    }
                )
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                # Extract URL from result
                test_url = 'No URL returned'
                if isinstance(result, dict):
                    test_url = result.get('url') or result.get('downloadUrl') or 'No URL in dict'
                else:
                    test_url = getattr(result, 'url', None) or getattr(result, 'downloadUrl', None) or 'No URL in object'
                
                response = {
                    'success': True,
                    'message': 'Blob storage is working correctly',
                    'hasToken': True,
                    'canUpload': True,
                    'testUrl': test_url,
                    'details': f'Successfully uploaded test file: {test_filename}',
                    'fullResult': str(result)  # Include full result for debugging
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
            except Exception as upload_error:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': False,
                    'error': f'Blob storage upload failed: {str(upload_error)}',
                    'hasToken': True,
                    'canUpload': False,
                    'details': 'Token exists but upload failed - check token permissions or quota'
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': False,
                'error': f'Blob storage test failed: {str(e)}',
                'hasToken': False,
                'canUpload': False
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))