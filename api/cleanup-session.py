from http.server import BaseHTTPRequestHandler
import json
import os
import re

# Try to import vercel_blob, but handle gracefully if not available
try:
    import vercel_blob
    BLOB_AVAILABLE = True
    print("✅ vercel_blob package imported successfully in cleanup-session")
except ImportError as e:
    print(f"❌ Failed to import vercel_blob in cleanup-session: {e}")
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
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            session_id = data.get('sessionId')
            
            if not session_id:
                self.send_error_response(400, 'Session ID is required')
                return
            
            # Validate session ID format (timestamp-uuid pattern)
            if not re.match(r'^\d{13}-[a-f0-9]{8}$', session_id):
                self.send_error_response(400, 'Invalid session ID format')
                return
            
            # Check if blob storage is available
            if not BLOB_AVAILABLE:
                self.send_error_response(503, 'Blob storage not available for cleanup operations')
                return
            
            # Check for required environment variable
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            if not blob_token:
                self.send_error_response(500, 'BLOB_READ_WRITE_TOKEN environment variable is required')
                return
            
            print(f"🧹 Starting cleanup for session: {session_id}")
            
            # Define session folder patterns
            session_patterns = [
                f"youtube-audio/{session_id}/",
                f"tts-audio/{session_id}/",
                f"final-audio/{session_id}/"
            ]
            
            total_files_deleted = 0
            total_folders_deleted = 0
            cleanup_errors = []
            
            # Clean up each folder pattern
            for pattern in session_patterns:
                try:
                    print(f"🔍 Cleaning up pattern: {pattern}")
                    
                    # List files matching the pattern
                    try:
                        # Use vercel_blob.list to find files with the session prefix
                        blob_list = vercel_blob.list({'prefix': pattern})
                        
                        # Handle different response formats
                        if hasattr(blob_list, 'blobs'):
                            blobs = blob_list.blobs
                        elif isinstance(blob_list, dict) and 'blobs' in blob_list:
                            blobs = blob_list['blobs']
                        elif isinstance(blob_list, list):
                            blobs = blob_list
                        else:
                            print(f"⚠️ Unexpected blob list format for {pattern}: {type(blob_list)}")
                            blobs = []
                        
                        files_in_pattern = len(blobs) if blobs else 0
                        print(f"📁 Found {files_in_pattern} files in {pattern}")
                        
                        if files_in_pattern > 0:
                            # Delete each file
                            for blob in blobs:
                                try:
                                    # Extract URL from blob object
                                    blob_url = None
                                    if isinstance(blob, dict):
                                        blob_url = blob.get('url') or blob.get('downloadUrl')
                                    else:
                                        blob_url = getattr(blob, 'url', None) or getattr(blob, 'downloadUrl', None)
                                    
                                    if blob_url:
                                        # Delete the blob
                                        vercel_blob.delete(blob_url)
                                        total_files_deleted += 1
                                        print(f"🗑️ Deleted file: {blob_url}")
                                    else:
                                        print(f"⚠️ Could not extract URL from blob: {blob}")
                                        
                                except Exception as delete_error:
                                    error_msg = f"Failed to delete file in {pattern}: {str(delete_error)}"
                                    print(f"❌ {error_msg}")
                                    cleanup_errors.append(error_msg)
                            
                            if files_in_pattern > 0:
                                total_folders_deleted += 1
                                print(f"✅ Cleaned folder: {pattern}")
                        else:
                            print(f"📂 No files found in {pattern}")
                            
                    except Exception as list_error:
                        error_msg = f"Failed to list files in {pattern}: {str(list_error)}"
                        print(f"❌ {error_msg}")
                        cleanup_errors.append(error_msg)
                        
                except Exception as pattern_error:
                    error_msg = f"Failed to process pattern {pattern}: {str(pattern_error)}"
                    print(f"❌ {error_msg}")
                    cleanup_errors.append(error_msg)
            
            # Prepare response
            success = len(cleanup_errors) == 0
            
            response_data = {
                'success': success,
                'sessionId': session_id,
                'filesDeleted': total_files_deleted,
                'foldersDeleted': total_folders_deleted,
                'errors': cleanup_errors if cleanup_errors else None
            }
            
            if cleanup_errors:
                response_data['error'] = f"Cleanup completed with {len(cleanup_errors)} errors"
            
            print(f"🎯 Cleanup summary for {session_id}:")
            print(f"   Files deleted: {total_files_deleted}")
            print(f"   Folders processed: {total_folders_deleted}")
            print(f"   Errors: {len(cleanup_errors)}")
            
            if success:
                print(f"✅ Session cleanup completed successfully")
            else:
                print(f"⚠️ Session cleanup completed with errors")
            
            self.send_json_response(200, response_data)
            
        except json.JSONDecodeError:
            self.send_error_response(400, 'Invalid JSON in request body')
        except Exception as e:
            error_msg = f'Cleanup operation failed: {str(e)}'
            print(f"💥 {error_msg}")
            self.send_error_response(500, error_msg)
    
    def do_GET(self):
        self.send_error_response(405, 'Method not allowed. Use POST to cleanup session.')
    
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
            'success': False,
            'error': message,
            'sessionId': None,
            'filesDeleted': 0,
            'foldersDeleted': 0
        }
        self.send_json_response(status_code, response)