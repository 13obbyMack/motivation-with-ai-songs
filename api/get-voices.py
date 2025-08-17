from http.server import BaseHTTPRequestHandler
import json
import requests

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
            
            api_key = data.get('apiKey')
            
            if not api_key:
                self.send_error_response(400, 'ElevenLabs API key is required')
                return
            
            headers = {
                'Accept': 'application/json',
                'xi-api-key': api_key,
                'User-Agent': 'Vercel-Function/1.0'
            }
            
            try:
                response = requests.get('https://api.elevenlabs.io/v1/voices', headers=headers, timeout=25)
                
                if not response.ok:
                    error_message = 'Failed to retrieve voices from ElevenLabs'
                    if response.status_code == 401:
                        error_message = 'Invalid ElevenLabs API key'
                    elif response.status_code == 429:
                        error_message = 'Rate limit exceeded. Please try again later'
                    elif response.status_code == 402:
                        error_message = 'Insufficient quota. Please check your ElevenLabs account'
                    
                    self.send_error_response(response.status_code, error_message)
                    return
                
                data = response.json()
                voices = []
                
                for voice in data.get('voices', []):
                    voices.append({
                        'voice_id': voice.get('voice_id'),
                        'name': voice.get('name'),
                        'category': voice.get('category', 'uncategorized'),
                        'description': voice.get('description'),
                        'preview_url': voice.get('preview_url')
                    })
                
                response_data = {
                    'voices': voices,
                    'success': True
                }
                
                self.send_json_response(200, response_data)
                
            except requests.Timeout:
                self.send_error_response(504, 'Request timeout - ElevenLabs API took too long to respond')
            except requests.RequestException:
                self.send_error_response(502, 'Network error connecting to ElevenLabs API')
                
        except Exception as e:
            self.send_error_response(500, f'An unexpected error occurred: {str(e)}')
    
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
            'voices': [],
            'success': False,
            'error': message
        }
        self.send_json_response(status_code, response)