"""
Vercel serverless function for YouTube audio extraction
"""

import json
import base64
import re
from urllib.parse import urlparse
from http.server import BaseHTTPRequestHandler
import yt_dlp
import requests

# YouTube URL validation regex
YOUTUBE_URL_REGEX = re.compile(
    r'^(https?://)?(www\.)?(youtube\.com/(watch\?v=|embed/|v/)|youtu\.be/)([a-zA-Z0-9_-]{11})(\S*)?$'
)

def validate_youtube_url(url: str) -> bool:
    """Validate YouTube URL format"""
    return bool(YOUTUBE_URL_REGEX.match(url.strip()))

def get_video_info(url: str) -> dict:
    """Extract video information using yt-dlp"""
    ydl_opts = {
        'format': 'bestaudio/best',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'extractaudio': True,
        'audioformat': 'mp3',
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Find best audio format
            audio_url = None
            if 'formats' in info:
                for fmt in info['formats']:
                    if fmt.get('acodec') and fmt.get('acodec') != 'none':
                        audio_url = fmt.get('url')
                        break
            
            if not audio_url and 'url' in info:
                audio_url = info['url']
                
            return {
                'title': info.get('title', 'Unknown Title'),
                'duration': info.get('duration', 0),
                'audio_url': audio_url
            }
    except Exception as e:
        raise Exception(f"Failed to extract video info: {str(e)}")

def download_audio(audio_url: str) -> bytes:
    """Download audio from URL"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/'
    }
    
    try:
        response = requests.get(audio_url, headers=headers, timeout=60)
        response.raise_for_status()
        
        # Check file size (max 10MB)
        content_length = response.headers.get('content-length')
        if content_length:
            size_mb = int(content_length) / (1024 * 1024)
            if size_mb > 10:
                raise Exception(f"Audio file too large ({size_mb:.2f}MB). Please use shorter videos.")
        
        return response.content
    except requests.RequestException as e:
        raise Exception(f"Failed to download audio: {str(e)}")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            youtube_url = data.get('youtubeUrl')
            
            if not youtube_url:
                self.send_error_response(400, 'YouTube URL is required')
                return
            
            # Validate URL
            if not validate_youtube_url(youtube_url):
                self.send_error_response(400, 'Please provide a valid YouTube URL')
                return
            
            # Get video info
            try:
                video_info = get_video_info(youtube_url)
            except Exception as e:
                self.send_error_response(400, str(e))
                return
            
            # Check duration (max 10 minutes)
            if video_info['duration'] > 600:
                self.send_error_response(400, 'Video is too long. Please use videos shorter than 10 minutes.')
                return
            
            # Download audio
            if not video_info['audio_url']:
                self.send_error_response(400, 'No audio stream available for this video')
                return
            
            try:
                audio_data = download_audio(video_info['audio_url'])
                audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                
                response = {
                    'audioData': audio_base64,
                    'duration': video_info['duration'],
                    'title': video_info['title'],
                    'success': True
                }
                
                self.send_json_response(200, response)
                
            except Exception as e:
                self.send_error_response(500, str(e))
                return
                
        except Exception as e:
            self.send_error_response(500, f'An unexpected error occurred: {str(e)}')
    
    def do_GET(self):
        self.send_error_response(405, 'Method not allowed. Use POST to extract audio.')
    
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
            'duration': 0,
            'title': '',
            'success': False,
            'error': message
        }
        self.send_json_response(status_code, response)