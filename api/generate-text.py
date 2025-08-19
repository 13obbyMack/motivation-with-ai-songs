"""
Vercel serverless function for OpenAI text generation
"""

import json
import re
from http.server import BaseHTTPRequestHandler
import openai

def validate_openai_key(api_key: str) -> bool:
    """Validate OpenAI API key format"""
    return api_key.startswith('sk-') and len(api_key) > 20

def create_user_prompt(user_data: dict) -> str:
    """Create user prompt for OpenAI"""
    name = user_data['name']
    physical_activity = user_data['physicalActivity']
    song_title = user_data.get('songTitle')
    sponsor = user_data.get('sponsor')
    custom_instructions = user_data.get('customInstructions')
    
    prompt = f"Create a powerful, personalized motivational message for {name} who is engaged in {physical_activity}."
    
    if song_title:
        prompt += f" They are listening to \"{song_title}\" during their activity."
    
    if sponsor:
        prompt += f" Include a natural mention of {sponsor} as a supporter of their journey."
    
    if custom_instructions:
        prompt += f" Additional instructions: {custom_instructions}"
    
    prompt += f"""

The message should:
- Be 2-3 minutes of spoken content (approximately 300-450 words)
- Be intensely personal and motivating
- Reference their specific activity ({physical_activity})
- Push them to overcome mental barriers and physical limitations
- Include specific actionable advice they can apply immediately
- Build to an emotional crescendo that drives action
- Feel like you're speaking directly to them in the moment

Make it raw, authentic, and powerful. This person needs to hear exactly what will push them to their next level."""
    
    return prompt

def chunk_text(text: str) -> list:
    """Chunk text into smaller segments for TTS"""
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
    chunks = []
    current_chunk = ""
    current_word_count = 0
    target_words = 100  # Reduced from 150 to create smaller audio files
    
    for sentence in sentences:
        sentence_words = len(sentence.split())
        
        if current_word_count + sentence_words > target_words and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = sentence
            current_word_count = sentence_words
        else:
            current_chunk += (". " if current_chunk else "") + sentence
            current_word_count += sentence_words
    
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return [chunk for chunk in chunks if chunk]

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            api_key = data.get('apiKey')
            user_data = data.get('userData')
            
            if not api_key or not user_data:
                self.send_error_response(400, 'Missing required fields: apiKey and userData are required')
                return
            
            if not validate_openai_key(api_key):
                self.send_error_response(401, 'Invalid OpenAI API key format. Key should start with "sk-"')
                return
            
            # Extract required fields
            name = user_data.get('name')
            character_prompt = user_data.get('characterPrompt')
            physical_activity = user_data.get('physicalActivity')
            
            if not all([name, character_prompt, physical_activity]):
                self.send_error_response(400, 'Missing required user data: name, characterPrompt, and physicalActivity are required')
                return
            
            # Create user prompt
            user_prompt = create_user_prompt(user_data)
            
            # Initialize OpenAI client
            client = openai.OpenAI(api_key=api_key)
            
            # Generate text
            try:
                completion = client.chat.completions.create(
                    model='gpt-4o',
                    messages=[
                        {'role': 'system', 'content': character_prompt},
                        {'role': 'user', 'content': user_prompt}
                    ],
                    max_tokens=1000,
                    temperature=0.8,
                    presence_penalty=0.1,
                    frequency_penalty=0.1
                )
                
                motivational_text = completion.choices[0].message.content
                if not motivational_text:
                    self.send_error_response(500, "No content generated from OpenAI API")
                    return
                
                # Chunk the text
                chunks = chunk_text(motivational_text.strip())
                
                response = {
                    'motivationalText': motivational_text.strip(),
                    'chunks': chunks,
                    'success': True
                }
                
                self.send_json_response(200, response)
                
            except openai.AuthenticationError:
                self.send_error_response(401, 'Invalid or expired OpenAI API key')
            except openai.RateLimitError:
                self.send_error_response(429, 'OpenAI API rate limit exceeded. Please try again later.')
            except openai.InsufficientQuotaError:
                self.send_error_response(402, 'Insufficient OpenAI API quota. Please check your billing.')
            except Exception as e:
                self.send_error_response(500, f'OpenAI API error: {str(e)}')
                
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
            'motivationalText': '',
            'chunks': [],
            'success': False,
            'error': message
        }
        self.send_json_response(status_code, response)