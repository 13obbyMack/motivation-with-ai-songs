"""
Vercel serverless function for audio splicing
Combines speech audio with background music
"""

import json
import base64
import tempfile
import os
from http.server import BaseHTTPRequestHandler
from io import BytesIO
import subprocess
import random

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            original_audio_b64 = data.get('originalAudio')
            speech_audio_b64 = data.get('speechAudio')
            splice_mode = data.get('spliceMode', 'intro')
            crossfade_duration = data.get('crossfadeDuration', 2.0)
            music_duration = data.get('musicDuration')
            
            if not all([original_audio_b64, speech_audio_b64]):
                self.send_error_response(400, 'Both original audio and speech audio are required')
                return
            
            # Create temporary directory for processing
            with tempfile.TemporaryDirectory() as temp_dir:
                # Decode and save original audio
                original_audio_data = base64.b64decode(original_audio_b64)
                original_path = os.path.join(temp_dir, 'original.mp3')
                with open(original_path, 'wb') as f:
                    f.write(original_audio_data)
                
                # Handle speech audio (single or multiple chunks)
                speech_paths = []
                if isinstance(speech_audio_b64, list):
                    # Multiple speech chunks
                    for i, chunk in enumerate(speech_audio_b64):
                        speech_data = base64.b64decode(chunk)
                        speech_path = os.path.join(temp_dir, f'speech_{i}.mp3')
                        with open(speech_path, 'wb') as f:
                            f.write(speech_data)
                        speech_paths.append(speech_path)
                    
                    # Concatenate speech chunks with gaps
                    combined_speech_path = os.path.join(temp_dir, 'combined_speech.mp3')
                    self.concatenate_audio_files(speech_paths, combined_speech_path)
                    speech_path = combined_speech_path
                else:
                    # Single speech chunk
                    speech_data = base64.b64decode(speech_audio_b64)
                    speech_path = os.path.join(temp_dir, 'speech.mp3')
                    with open(speech_path, 'wb') as f:
                        f.write(speech_data)
                
                # Get audio durations
                original_duration = self.get_audio_duration(original_path)
                speech_duration = self.get_audio_duration(speech_path)
                
                # Create output path
                output_path = os.path.join(temp_dir, 'final.mp3')
                
                # Splice based on mode
                if splice_mode == 'intro':
                    self.splice_intro(speech_path, original_path, output_path)
                elif splice_mode == 'random':
                    self.splice_random(speech_path, original_path, output_path, original_duration, speech_duration)
                elif splice_mode == 'distributed':
                    self.splice_distributed(speech_path, original_path, output_path, original_duration, speech_duration)
                else:
                    # Default to intro
                    self.splice_intro(speech_path, original_path, output_path)
                
                # Apply music duration limit if specified
                if music_duration:
                    limited_path = os.path.join(temp_dir, 'limited.mp3')
                    self.limit_duration(output_path, limited_path, music_duration)
                    output_path = limited_path
                
                # Read final audio and encode to base64
                with open(output_path, 'rb') as f:
                    final_audio_data = f.read()
                
                final_audio_b64 = base64.b64encode(final_audio_data).decode('utf-8')
                
                response_data = {
                    'finalAudio': final_audio_b64,
                    'success': True
                }
                
                self.send_json_response(200, response_data)
                
        except Exception as e:
            self.send_error_response(500, f'Audio splicing error: {str(e)}')
    
    def concatenate_audio_files(self, input_paths, output_path):
        """Concatenate multiple audio files with gaps"""
        # Create filter complex for concatenation with silence
        filter_parts = []
        inputs = []
        
        for i, path in enumerate(input_paths):
            inputs.extend(['-i', path])
            if i > 0:
                # Add 0.5 second silence between chunks
                filter_parts.append(f'aevalsrc=0:duration=0.5:sample_rate=44100[silence{i}];')
            filter_parts.append(f'[{i}:a]')
            if i > 0:
                filter_parts.append(f'[silence{i}]')
        
        filter_parts.append(f'concat=n={len(input_paths) * 2 - 1}:v=0:a=1[out]')
        filter_complex = ''.join(filter_parts)
        
        cmd = [
            'ffmpeg', '-y',
            *inputs,
            '-filter_complex', filter_complex,
            '-map', '[out]',
            '-c:a', 'mp3',
            '-b:a', '128k',
            output_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
    
    def get_audio_duration(self, audio_path):
        """Get audio duration in seconds"""
        cmd = [
            'ffprobe', '-v', 'quiet',
            '-show_entries', 'format=duration',
            '-of', 'csv=p=0',
            audio_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(result.stdout.strip())
    
    def splice_intro(self, speech_path, music_path, output_path):
        """Splice speech at the beginning, then music"""
        cmd = [
            'ffmpeg', '-y',
            '-i', speech_path,
            '-i', music_path,
            '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[out]',
            '-map', '[out]',
            '-c:a', 'mp3',
            '-b:a', '128k',
            output_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
    
    def splice_random(self, speech_path, music_path, output_path, music_duration, speech_duration):
        """Insert speech at random point in music"""
        if music_duration > speech_duration * 2:
            # Find insertion point (20% to 80% into the track)
            min_start = music_duration * 0.2
            max_start = music_duration * 0.8 - speech_duration
            
            if max_start > min_start:
                insert_point = random.uniform(min_start, max_start)
                
                # Split music and insert speech
                cmd = [
                    'ffmpeg', '-y',
                    '-i', music_path,
                    '-i', speech_path,
                    '-filter_complex', 
                    f'[0:a]atrim=0:{insert_point}[before];'
                    f'[0:a]atrim={insert_point + speech_duration}[after];'
                    f'[before][1:a][after]concat=n=3:v=0:a=1[out]',
                    '-map', '[out]',
                    '-c:a', 'mp3',
                    '-b:a', '128k',
                    output_path
                ]
                
                subprocess.run(cmd, check=True, capture_output=True)
            else:
                # Fallback to intro mode
                self.splice_intro(speech_path, music_path, output_path)
        else:
            # Fallback to intro mode
            self.splice_intro(speech_path, music_path, output_path)
    
    def splice_distributed(self, speech_path, music_path, output_path, music_duration, speech_duration):
        """Overlay speech on music at reduced volume"""
        if music_duration > speech_duration:
            # Overlay speech on music with volume adjustment
            cmd = [
                'ffmpeg', '-y',
                '-i', music_path,
                '-i', speech_path,
                '-filter_complex', 
                '[0:a]volume=0.3[music];'  # Reduce music volume to 30%
                '[1:a]adelay=5000|5000[speech];'  # Delay speech by 5 seconds
                '[music][speech]amix=inputs=2:duration=first[out]',
                '-map', '[out]',
                '-c:a', 'mp3',
                '-b:a', '128k',
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
        else:
            # Fallback to intro mode
            self.splice_intro(speech_path, music_path, output_path)
    
    def limit_duration(self, input_path, output_path, max_duration):
        """Limit audio duration"""
        cmd = [
            'ffmpeg', '-y',
            '-i', input_path,
            '-t', str(max_duration),
            '-c:a', 'mp3',
            '-b:a', '128k',
            output_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
    
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
            'finalAudio': '',
            'success': False,
            'error': message
        }
        self.send_json_response(status_code, response)