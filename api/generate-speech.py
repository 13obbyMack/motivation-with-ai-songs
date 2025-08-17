"""
Vercel serverless function for ElevenLabs TTS
"""

import json
import base64
from http.server import BaseHTTPRequestHandler
import requests

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
    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            api_key = data.get('apiKey')
            text = data.get('text')
            voice_id = data.get('voiceId')
            settings = data.get('settings', {})
            model_id = data.get('modelId', 'eleven_multilingual_v2')
            output_format = data.get('outputFormat', 'mp3_44100_128')
            
            if not all([api_key, text, voice_id]):
                self.send_error_response(400, 'API key, text, and voice ID are required')
                return
            
            # Validate text length
            model_limit = ELEVENLABS_MODELS.get(model_id, {}).get('limit', 5000)
            if len(text) > model_limit:
                self.send_error_response(400, f'Text exceeds {model_id} character limit of {model_limit}')
                return
            
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
                response = requests.post(
                    f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}',
                    headers=headers,
                    json=payload,
                    timeout=60
                )
                
                if not response.ok:
                    error_message = 'Failed to generate speech'
                    if response.status_code == 401:
                        error_message = 'Invalid ElevenLabs API key'
                    elif response.status_code == 429:
                        error_message = 'Rate limit exceeded. Please try again later'
                    elif response.status_code == 402:
                        error_message = 'Insufficient quota. Please check your ElevenLabs account'
                    
                    self.send_error_response(response.status_code, error_message)
                    return
                
                audio_base64 = base64.b64encode(response.content).decode('utf-8')
                
                response_data = {
                    'audioData': audio_base64,
                    'success': True
                }
                
                self.send_json_response(200, response_data)
                
            except requests.RequestException as e:
                self.send_error_response(500, f'ElevenLabs API error: {str(e)}')
                
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
            'audioData': '',
            'success': False,
            'error': message
        }
        self.send_json_response(status_code, response)