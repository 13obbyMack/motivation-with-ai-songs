from http.server import BaseHTTPRequestHandler
import json
import os
import time

# Try to import vercel_blob
try:
    import vercel_blob
    BLOB_AVAILABLE = True
    print("✅ vercel_blob imported successfully")
except ImportError as e:
    BLOB_AVAILABLE = False
    vercel_blob = None
    print(f"❌ vercel_blob import failed: {e}")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        self.do_POST()

    def do_POST(self):
        try:
            # Test blob storage setup
            test_results = {
                'blob_available': BLOB_AVAILABLE,
                'vercel_blob_module': str(vercel_blob),
                'has_put_function': hasattr(vercel_blob, 'put') if BLOB_AVAILABLE else False,
                'blob_token_set': bool(os.getenv('BLOB_READ_WRITE_TOKEN')),
                'blob_token_length': len(os.getenv('BLOB_READ_WRITE_TOKEN', '')),
            }
            
            if BLOB_AVAILABLE:
                test_results['available_functions'] = [attr for attr in dir(vercel_blob) if not attr.startswith('_')]
            
            # Try a simple upload test
            if BLOB_AVAILABLE and os.getenv('BLOB_READ_WRITE_TOKEN'):
                try:
                    test_content = b"Simple test content"
                    test_filename = f"test-simple-{int(time.time())}.txt"
                    
                    result = vercel_blob.put(
                        test_filename,
                        test_content,
                        {
                            'addRandomSuffix': 'true',
                            'contentType': 'text/plain'
                        }
                    )
                    
                    test_results['upload_test'] = 'SUCCESS'
                    test_results['upload_result'] = str(result)
                    test_results['upload_result_type'] = str(type(result))
                    
                    # Try to extract URL
                    if isinstance(result, dict):
                        url = result.get('url') or result.get('downloadUrl')
                    else:
                        url = getattr(result, 'url', None) or getattr(result, 'downloadUrl', None)
                    
                    test_results['extracted_url'] = url
                    
                except Exception as e:
                    test_results['upload_test'] = 'FAILED'
                    test_results['upload_error'] = str(e)
                    test_results['upload_error_type'] = str(type(e))
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'test_results': test_results
            }
            
            self.wfile.write(json.dumps(response, indent=2).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': False,
                'error': str(e),
                'error_type': str(type(e))
            }
            
            self.wfile.write(json.dumps(response).encode('utf-8'))