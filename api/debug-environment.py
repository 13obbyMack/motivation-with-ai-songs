from http.server import BaseHTTPRequestHandler
import json
import os
import sys

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        self.do_POST()

    def do_POST(self):
        try:
            # Check Python version
            python_version = sys.version
            
            # Check if vercel_blob is available
            try:
                import vercel_blob
                blob_available = True
                blob_version = getattr(vercel_blob, '__version__', 'unknown')
                blob_file = getattr(vercel_blob, '__file__', 'unknown')
                blob_functions = [attr for attr in dir(vercel_blob) if not attr.startswith('_')]
                has_put_function = hasattr(vercel_blob, 'put')
            except ImportError as e:
                blob_available = False
                blob_version = f"Import error: {str(e)}"
                blob_file = None
                blob_functions = []
                has_put_function = False
            
            # Check environment variables
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            vercel_env = os.getenv('VERCEL_ENV')
            
            # Get all environment variables that contain 'BLOB' or 'VERCEL'
            relevant_env_vars = {}
            for key, value in os.environ.items():
                if 'BLOB' in key.upper() or 'VERCEL' in key.upper():
                    if 'TOKEN' in key.upper():
                        relevant_env_vars[key] = f"{value[:10]}...{value[-4:]}" if len(value) > 14 else value
                    else:
                        relevant_env_vars[key] = value
            
            # Check installed packages
            try:
                import pkg_resources
                installed_packages = [str(d) for d in pkg_resources.working_set]
                blob_packages = [pkg for pkg in installed_packages if 'blob' in pkg.lower()]
            except:
                blob_packages = ["Unable to check installed packages"]
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'python_version': python_version,
                'blob_available': blob_available,
                'blob_version': blob_version,
                'blob_file': blob_file,
                'blob_functions': blob_functions,
                'has_put_function': has_put_function,
                'has_blob_token': bool(blob_token),
                'blob_token_length': len(blob_token) if blob_token else 0,
                'vercel_env': vercel_env,
                'relevant_env_vars': relevant_env_vars,
                'blob_related_packages': blob_packages,
                'sys_path': sys.path[:5]  # First 5 entries only
            }
            
            self.wfile.write(json.dumps(response, indent=2).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': False,
                'error': f'Debug endpoint failed: {str(e)}'
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))