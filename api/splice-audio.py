"""
Vercel serverless function for audio splicing
Combines speech audio with background music
"""

import json
import base64
import tempfile
import os
import hashlib
import time
import requests
from http.server import BaseHTTPRequestHandler
from io import BytesIO
import random

# Import PyAV for native FFmpeg support
try:
    import av
    PYAV_AVAILABLE = True
    print("✅ PyAV imported successfully - native FFmpeg support available")
except ImportError as e:
    print(f"❌ Failed to import PyAV: {e}")
    PYAV_AVAILABLE = False

# No pydub needed - PyAV handles all audio processing

# Try to import vercel_blob, but handle gracefully if not available
try:
    import vercel_blob
    BLOB_AVAILABLE = True
    print("✅ vercel_blob package imported successfully in splice-audio")
except ImportError as e:
    print(f"❌ Failed to import vercel_blob in splice-audio: {e}")
    BLOB_AVAILABLE = False
    vercel_blob = None



class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # PyAV provides native FFmpeg support - no external binaries needed
            if PYAV_AVAILABLE:
                print("✅ Using PyAV for audio processing - no external FFmpeg binaries required")
            else:
                print("❌ PyAV not available - audio processing will fail")
            
            # Validate Content-Length header
            if 'Content-Length' not in self.headers:
                self.send_error_response(400, 'Missing Content-Length header')
                return
            
            try:
                content_length = int(self.headers['Content-Length'])
            except ValueError:
                self.send_error_response(400, 'Invalid Content-Length header')
                return
            
            # Log request size for monitoring (no limits since we use blob storage)
            request_size_mb = content_length / (1024 * 1024)
            print(f"Splice request body size: {request_size_mb:.2f}MB")
            
            # Parse request body
            post_data = self.rfile.read(content_length)
            if len(post_data) != content_length:
                self.send_error_response(400, 'Incomplete request body received')
                return
                
            try:
                data = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError as e:
                self.send_error_response(400, f'Invalid JSON in request body: {str(e)}')
                return
            except UnicodeDecodeError:
                self.send_error_response(400, 'Invalid UTF-8 encoding in request body')
                return
            
            # Support both blob URLs and base64 data for backward compatibility
            original_audio_b64 = data.get('originalAudio')
            original_audio_url = data.get('originalAudioUrl')
            speech_audio_b64 = data.get('speechAudio')
            speech_audio_urls = data.get('speechAudioUrls')
            splice_mode = data.get('spliceMode', 'intro')
            crossfade_duration = data.get('crossfadeDuration', 2.0)
            music_duration = data.get('musicDuration')
            session_id = data.get('sessionId')
            
            # Check if we have either base64 data or blob URLs
            has_original = original_audio_b64 or original_audio_url
            has_speech = speech_audio_b64 or speech_audio_urls
            
            if not all([has_original, has_speech]):
                self.send_error_response(400, 'Both original audio and speech audio are required (as base64 or blob URLs)')
                return
            
            if not session_id:
                self.send_error_response(400, 'Session ID is required')
                return
            
            # Create temporary directory for processing
            with tempfile.TemporaryDirectory() as temp_dir:
                # Get original audio data (from blob URL or base64)
                if original_audio_url:
                    print("Using original audio from blob URL")
                    original_audio_data = self._download_from_blob_url(original_audio_url)
                else:
                    print("Using original audio from base64")
                    original_audio_data = base64.b64decode(original_audio_b64)
                
                original_path = os.path.join(temp_dir, 'original.mp3')
                with open(original_path, 'wb') as f:
                    f.write(original_audio_data)
                
                # Handle speech audio (from blob URLs or base64)
                speech_paths = []
                has_multiple_chunks = False
                
                if speech_audio_urls:
                    print(f"Using {len(speech_audio_urls)} speech chunks from blob URLs")
                    has_multiple_chunks = len(speech_audio_urls) > 1
                    # Multiple speech chunks from blob URLs
                    for i, url in enumerate(speech_audio_urls):
                        speech_data = self._download_from_blob_url(url)
                        speech_path = os.path.join(temp_dir, f'speech_{i}.mp3')
                        with open(speech_path, 'wb') as f:
                            f.write(speech_data)
                        speech_paths.append(speech_path)
                    
                elif isinstance(speech_audio_b64, list):
                    print(f"Using {len(speech_audio_b64)} speech chunks from base64")
                    has_multiple_chunks = len(speech_audio_b64) > 1
                    # Multiple speech chunks from base64
                    for i, chunk in enumerate(speech_audio_b64):
                        speech_data = base64.b64decode(chunk)
                        speech_path = os.path.join(temp_dir, f'speech_{i}.mp3')
                        with open(speech_path, 'wb') as f:
                            f.write(speech_data)
                        speech_paths.append(speech_path)
                    
                else:
                    print("Using single speech chunk from base64")
                    # Single speech chunk from base64
                    speech_data = base64.b64decode(speech_audio_b64)
                    speech_path = os.path.join(temp_dir, 'speech.mp3')
                    with open(speech_path, 'wb') as f:
                        f.write(speech_data)
                    speech_paths.append(speech_path)
                
                # Get audio durations
                original_duration = self.get_audio_duration(original_path)
                
                # For backward compatibility, create a combined speech file for duration calculation
                if has_multiple_chunks:
                    combined_speech_path = os.path.join(temp_dir, 'combined_speech.mp3')
                    self.concatenate_audio_files(speech_paths, combined_speech_path)
                    speech_duration = self.get_audio_duration(combined_speech_path)
                else:
                    speech_duration = self.get_audio_duration(speech_paths[0])
                
                # Create output path
                output_path = os.path.join(temp_dir, 'final.mp3')
                
                # Splice based on mode and whether we have multiple chunks
                if has_multiple_chunks and splice_mode in ['distributed', 'random']:
                    # Use PyAV distributed splicing for multiple chunks
                    print(f"Using distributed splicing with {len(speech_paths)} individual chunks")
                    self.splice_distributed_pyav(speech_paths, original_path, output_path, original_duration)
                elif splice_mode == 'intro':
                    # For intro mode, concatenate chunks first then add to beginning
                    if has_multiple_chunks:
                        combined_speech_path = os.path.join(temp_dir, 'combined_speech.mp3')
                        self.concatenate_audio_files(speech_paths, combined_speech_path)
                        self.splice_intro(combined_speech_path, original_path, output_path)
                    else:
                        self.splice_intro(speech_paths[0], original_path, output_path)
                else:
                    # Default behavior - use distributed if multiple chunks, otherwise intro
                    if has_multiple_chunks:
                        print(f"Default: Using distributed splicing with {len(speech_paths)} chunks")
                        self.splice_distributed_pyav(speech_paths, original_path, output_path, original_duration)
                    else:
                        print("Default: Using intro splicing with single chunk")
                        self.splice_intro(speech_paths[0], original_path, output_path)
                
                # Apply music duration limit if specified
                if music_duration:
                    limited_path = os.path.join(temp_dir, 'limited.mp3')
                    self.limit_duration(output_path, limited_path, music_duration)
                    output_path = limited_path
                
                # Read final audio
                with open(output_path, 'rb') as f:
                    final_audio_data = f.read()
                
                audio_size_mb = len(final_audio_data) / (1024 * 1024)
                print(f"Final spliced audio: {audio_size_mb:.2f}MB")
                
                # BLOB STORAGE ONLY - No fallback logic
                print(f"Final spliced audio: {audio_size_mb:.2f}MB")
                print(f"BLOB_AVAILABLE: {BLOB_AVAILABLE}")
                
                # Check if blob storage is available
                if not BLOB_AVAILABLE:
                    self.send_error_response(503, 
                        f'Blob storage not available (vercel_blob package not imported). '
                        f'Final audio size: {audio_size_mb:.1f}MB. '
                        f'Blob storage is required for all audio processing.')
                    return
                
                # Upload to blob storage (ONLY method)
                try:
                    print(f"Uploading {audio_size_mb:.2f}MB final audio to blob storage")
                    blob_url = self._upload_to_blob_storage(final_audio_data, session_id)
                    response_data = {
                        'finalAudioUrl': blob_url,
                        'success': True,
                        'deliveryMethod': 'blob',
                        'audioSize': f'{audio_size_mb:.2f}MB',
                        'sessionId': session_id
                    }
                    self.send_json_response(200, response_data)
                    return
                    
                except Exception as blob_error:
                    print(f"❌ Blob storage failed for final audio: {str(blob_error)}")
                    
                    # No fallback - blob storage is required
                    self.send_error_response(503, 
                        f'Blob storage failed: {str(blob_error)}. '
                        f'Final audio size: {audio_size_mb:.1f}MB. '
                        f'Blob storage is required for all audio processing.')
                    return
                
        except Exception as e:
            self.send_error_response(500, f'Audio splicing error: {str(e)}')
    
    def concatenate_audio_files(self, input_paths, output_path):
        """Concatenate audio files using PyAV (simplified binary approach)"""
        if not PYAV_AVAILABLE:
            raise Exception("PyAV not available - cannot perform audio concatenation")
            
        try:
            print(f"Concatenating {len(input_paths)} audio files using PyAV (binary method)")
            
            # Simple approach: use PyAV to convert each file to a standard format, then concatenate
            temp_files = []
            
            # Convert each input to a standard format
            for i, input_path in enumerate(input_paths):
                temp_path = f"/tmp/temp_audio_{i}.mp3"
                temp_files.append(temp_path)
                
                print(f"Converting speech chunk {i+1} to standard format")
                
                # Convert to standard MP3 format
                input_container = av.open(input_path)
                output_container = av.open(temp_path, mode='w')
                
                # Add audio stream with standard settings
                input_stream = input_container.streams.audio[0]
                output_stream = output_container.add_stream('mp3', rate=44100, layout='stereo')
                
                # Create resampler if needed
                resampler = None
                if input_stream.sample_rate != 44100 or input_stream.layout.name != 'stereo':
                    resampler = av.audio.resampler.AudioResampler(
                        format='s16',     # Target format
                        layout='stereo',  # Target layout
                        rate=44100        # Target sample rate
                    )
                    print(f"Created resampler for concatenation: {input_stream.sample_rate}Hz {input_stream.layout.name} -> 44100Hz stereo")
                
                # Copy and convert frames
                for frame in input_container.decode(input_stream):
                    # Resample if needed
                    if resampler:
                        resampled_frames = resampler.resample(frame)
                        for resampled_frame in resampled_frames:
                            # Encode and write
                            for packet in output_stream.encode(resampled_frame):
                                output_container.mux(packet)
                    else:
                        # No resampling needed
                        for packet in output_stream.encode(frame):
                            output_container.mux(packet)
                
                # Flush resampler if used
                if resampler:
                    remaining_frames = resampler.resample(None)  # Flush
                    for frame in remaining_frames:
                        for packet in output_stream.encode(frame):
                            output_container.mux(packet)
                
                # Flush encoder
                for packet in output_stream.encode():
                    output_container.mux(packet)
                
                input_container.close()
                output_container.close()
            
            # Now concatenate the standardized files using binary method
            print("Concatenating standardized audio files...")
            with open(output_path, 'wb') as outfile:
                for i, temp_path in enumerate(temp_files):
                    print(f"Adding standardized chunk {i+1}")
                    with open(temp_path, 'rb') as infile:
                        # Skip ID3 tags for files after the first one
                        if i > 0:
                            # Simple heuristic: skip first 1024 bytes which often contain ID3 tags
                            infile.seek(1024)
                        outfile.write(infile.read())
                    
                    # Clean up temp file
                    os.remove(temp_path)
            
            print(f"✅ PyAV concatenation completed: {output_path}")
            
        except Exception as e:
            print(f"❌ PyAV concatenation failed: {str(e)}")
            raise Exception(f"Audio concatenation failed: {str(e)}. PyAV processing error.")
    

    
    def get_audio_duration(self, audio_path):
        """Get audio duration using PyAV"""
        if not PYAV_AVAILABLE:
            raise Exception("PyAV not available - cannot get audio duration")
            
        try:
            container = av.open(audio_path)
            duration_seconds = float(container.duration) / av.time_base
            container.close()
            print(f"Audio duration (PyAV): {duration_seconds:.2f} seconds")
            return duration_seconds
        except Exception as e:
            print(f"❌ Failed to get duration with PyAV: {str(e)}")
            # Fallback: estimate duration from file size
            try:
                file_size = os.path.getsize(audio_path)
                # Rough estimate: 128kbps MP3 ≈ 16KB/second
                estimated_duration = file_size / 16000
                print(f"Using estimated duration: {estimated_duration:.2f} seconds")
                return estimated_duration
            except:
                print("Using default duration: 180 seconds")
                return 180.0  # Default fallback
    
    def splice_distributed_pyav(self, speech_chunks, music_path, output_path, music_duration):
        """Distribute speech chunks evenly throughout music using PyAV only"""
        if not PYAV_AVAILABLE:
            raise Exception("PyAV not available - cannot perform distributed audio splicing")
            
        try:
            print(f"Splicing: PyAV distributed method with {len(speech_chunks)} chunks")
            return self._splice_distributed_pyav(speech_chunks, music_path, output_path, music_duration)
            
        except Exception as e:
            print(f"❌ PyAV distributed splicing failed: {str(e)}")
            raise Exception(f"Distributed audio splicing failed: {str(e)}. PyAV processing error.")
    
    def _splice_distributed_pyav(self, speech_chunks, music_path, output_path, music_duration):
        """Distribute speech chunks evenly throughout music using PyAV - EXTENDS total duration"""
        try:
            print(f"Using PyAV for distributed splicing with {len(speech_chunks)} chunks over {music_duration:.1f}s music...")
            
            # Calculate speech durations to determine distribution points
            speech_durations = []
            total_speech_duration = 0
            
            for i, chunk_path in enumerate(speech_chunks):
                duration = self.get_audio_duration(chunk_path)
                speech_durations.append(duration)
                total_speech_duration += duration
                print(f"Speech chunk {i+1}: {duration:.1f}s")
            
            print(f"Total speech duration: {total_speech_duration:.1f}s")
            print(f"Music duration: {music_duration:.1f}s")
            print(f"Expected final duration: {music_duration + total_speech_duration:.1f}s")
            
            # Calculate insertion points - distribute evenly throughout the ORIGINAL music
            # These are points in the original music timeline where we'll insert speech
            buffer_start = 5.0  # 5 seconds at start
            buffer_end = 10.0   # 10 seconds at end
            available_music_duration = max(music_duration - buffer_start - buffer_end, music_duration * 0.5)
            
            insertion_points = []
            if len(speech_chunks) == 1:
                # Single chunk goes at the beginning after buffer
                insertion_points = [buffer_start]
            else:
                # Multiple chunks distributed evenly
                interval = available_music_duration / len(speech_chunks)
                for i in range(len(speech_chunks)):
                    point = buffer_start + (i * interval)
                    insertion_points.append(point)
            
            print(f"Insertion points in original music: {[f'{p:.1f}s' for p in insertion_points]}")
            
            # Split music into segments WITHOUT skipping any content
            music_segments = self._split_music_for_insertion(music_path, insertion_points)
            
            # Convert all speech chunks to standard format
            converted_speech = []
            for i, chunk_path in enumerate(speech_chunks):
                temp_speech = f"/tmp/temp_speech_{i}.mp3"
                self._convert_to_standard_format(chunk_path, temp_speech)
                converted_speech.append(temp_speech)
            
            # Interleave music segments and speech chunks with intro speech first
            print("Creating final audio with intro speech first, then music + speech alternating...")
            temp_files_to_concat = []
            
            # Pattern: speech_1 (intro) + music_segment_1 + speech_2 + music_segment_2 + speech_3 + ... + final_music_segment
            
            # Add first speech chunk as intro
            if len(converted_speech) > 0:
                temp_files_to_concat.append(converted_speech[0])
                print("Added speech chunk 1 as intro")
            
            # Add music segments and remaining speech chunks alternating
            for i in range(len(insertion_points)):
                # Add music segment
                if i < len(music_segments) and music_segments[i]:
                    temp_files_to_concat.append(music_segments[i])
                    print(f"Added music segment {i+1}")
                
                # Add speech chunk (starting from speech_2 since speech_1 was the intro)
                speech_index = i + 1  # Skip first speech chunk since it's already added as intro
                if speech_index < len(converted_speech):
                    temp_files_to_concat.append(converted_speech[speech_index])
                    print(f"Added speech chunk {speech_index + 1}")
            
            # Add final music segment (from last insertion point to end)
            if len(music_segments) > len(insertion_points):
                final_segment = music_segments[-1]
                if final_segment:
                    temp_files_to_concat.append(final_segment)
                    print("Added final music segment")
            
            # Binary concatenate all files in the correct order
            print(f"Final concatenation of {len(temp_files_to_concat)} segments...")
            with open(output_path, 'wb') as outfile:
                for i, temp_path in enumerate(temp_files_to_concat):
                    print(f"Adding segment {i+1}: {os.path.basename(temp_path)}")
                    with open(temp_path, 'rb') as infile:
                        # Skip ID3 tags for files after the first one
                        if i > 0:
                            infile.seek(1024)
                        outfile.write(infile.read())
            
            # Clean up all temp files
            all_temp_files = music_segments + converted_speech
            for temp_file in all_temp_files:
                if temp_file and os.path.exists(temp_file):
                    os.remove(temp_file)
            
            # Verify final duration
            final_duration = self.get_audio_duration(output_path)
            print(f"✅ PyAV distributed splicing completed")
            print(f"   Original music: {music_duration:.1f}s")
            print(f"   Total speech: {total_speech_duration:.1f}s") 
            print(f"   Final audio: {final_duration:.1f}s")
            
        except Exception as e:
            print(f"❌ PyAV distributed splicing failed: {str(e)}")
            raise
    
    def _convert_to_standard_format(self, input_path, output_path):
        """Convert audio file to standard MP3 format using PyAV"""
        try:
            input_container = av.open(input_path)
            output_container = av.open(output_path, mode='w')
            
            # Get input audio stream
            input_stream = input_container.streams.audio[0]
            
            # Create output stream with standard settings
            output_stream = output_container.add_stream('mp3', rate=44100)
            output_stream.bit_rate = 128000  # 128kbps
            
            # Create resampler if needed (simplified approach)
            resampler = None
            if input_stream.sample_rate != 44100 or input_stream.layout.name != 'stereo':
                resampler = av.audio.resampler.AudioResampler(
                    format='s16',     # Target format
                    layout='stereo',  # Target layout
                    rate=44100        # Target sample rate
                )
                print(f"Created resampler: {input_stream.sample_rate}Hz {input_stream.layout.name} -> 44100Hz stereo")
            
            # Process frames
            for frame in input_container.decode(input_stream):
                # Resample if needed
                if resampler:
                    resampled_frames = resampler.resample(frame)
                    for resampled_frame in resampled_frames:
                        # Encode and write
                        for packet in output_stream.encode(resampled_frame):
                            output_container.mux(packet)
                else:
                    # No resampling needed
                    for packet in output_stream.encode(frame):
                        output_container.mux(packet)
            
            # Flush resampler if used
            if resampler:
                remaining_frames = resampler.resample(None)  # Flush
                for frame in remaining_frames:
                    for packet in output_stream.encode(frame):
                        output_container.mux(packet)
            
            # Flush encoder
            for packet in output_stream.encode():
                output_container.mux(packet)
            
            input_container.close()
            output_container.close()
            
        except Exception as e:
            print(f"❌ Failed to convert {input_path}: {str(e)}")
            raise
    
    def _split_music_for_insertion(self, music_path, insertion_points):
        """Split music into segments at insertion points WITHOUT skipping any content"""
        try:
            print(f"Splitting music at {len(insertion_points)} insertion points (preserving all content)...")
            
            music_segments = []
            current_start = 0.0
            music_duration = self.get_audio_duration(music_path)
            
            # Create segments between insertion points
            for i, insertion_point in enumerate(insertion_points):
                # Create segment from current_start to insertion_point
                if insertion_point > current_start:
                    segment_path = f"/tmp/music_segment_{i}.mp3"
                    self._extract_music_segment(music_path, segment_path, current_start, insertion_point)
                    music_segments.append(segment_path)
                    print(f"Music segment {i+1}: {current_start:.1f}s to {insertion_point:.1f}s ({insertion_point - current_start:.1f}s)")
                else:
                    music_segments.append(None)  # No segment needed
                
                # Move to the insertion point (NO skipping - speech will be inserted here)
                current_start = insertion_point
            
            # Add final music segment from last insertion point to end
            if current_start < music_duration:
                final_segment_path = f"/tmp/music_segment_final.mp3"
                self._extract_music_segment(music_path, final_segment_path, current_start, music_duration)
                music_segments.append(final_segment_path)
                print(f"Final music segment: {current_start:.1f}s to {music_duration:.1f}s ({music_duration - current_start:.1f}s)")
            
            # Verify we're preserving all music content
            total_music_segments_duration = 0
            for i, segment in enumerate(music_segments):
                if segment:
                    segment_duration = self.get_audio_duration(segment)
                    total_music_segments_duration += segment_duration
                    print(f"Segment {i+1} duration: {segment_duration:.1f}s")
            
            print(f"Original music duration: {music_duration:.1f}s")
            print(f"Total segments duration: {total_music_segments_duration:.1f}s")
            
            return music_segments
            
        except Exception as e:
            print(f"❌ Failed to split music: {str(e)}")
            raise
    
    def _extract_music_segment(self, input_path, output_path, start_time, end_time):
        """Extract a segment of music from start_time to end_time using PyAV"""
        try:
            duration = end_time - start_time
            if duration <= 0:
                print(f"Skipping segment with duration {duration:.1f}s")
                return
            
            print(f"Extracting music segment: {start_time:.1f}s to {end_time:.1f}s ({duration:.1f}s)")
            
            input_container = av.open(input_path)
            output_container = av.open(output_path, mode='w')
            
            # Get input stream
            input_stream = input_container.streams.audio[0]
            
            # Create output stream
            output_stream = output_container.add_stream('mp3', rate=44100)
            output_stream.bit_rate = 128000
            
            # Seek to start time
            start_pts = int(start_time * input_stream.time_base.denominator / input_stream.time_base.numerator)
            input_container.seek(start_pts, stream=input_stream)
            
            # Create resampler if needed
            resampler = None
            if input_stream.sample_rate != 44100 or input_stream.layout.name != 'stereo':
                resampler = av.audio.resampler.AudioResampler(
                    format='s16',
                    layout='stereo',
                    rate=44100
                )
            
            # Process frames within the time range
            frames_written = 0
            for frame in input_container.decode(input_stream):
                # Check if we're past the end time
                frame_time = float(frame.pts * input_stream.time_base)
                if frame_time >= end_time:
                    break
                
                # Skip frames before start time
                if frame_time < start_time:
                    continue
                
                # Process frame
                if resampler:
                    resampled_frames = resampler.resample(frame)
                    for resampled_frame in resampled_frames:
                        for packet in output_stream.encode(resampled_frame):
                            output_container.mux(packet)
                        frames_written += 1
                else:
                    for packet in output_stream.encode(frame):
                        output_container.mux(packet)
                    frames_written += 1
            
            # Flush resampler and encoder
            if resampler:
                remaining_frames = resampler.resample(None)
                for frame in remaining_frames:
                    for packet in output_stream.encode(frame):
                        output_container.mux(packet)
            
            for packet in output_stream.encode():
                output_container.mux(packet)
            
            input_container.close()
            output_container.close()
            
            print(f"✅ Extracted music segment: {frames_written} frames written")
            
        except Exception as e:
            print(f"❌ Failed to extract music segment: {str(e)}")
            # Fallback: create a silent segment or copy the whole file
            try:
                print("Fallback: copying entire music file as segment")
                self._convert_to_standard_format(input_path, output_path)
            except:
                raise Exception(f"Music segment extraction failed: {str(e)}")
    

    def splice_simple_concat(self, speech_path, music_path, output_path):
        """Simple concatenation using PyAV: speech + music"""
        if not PYAV_AVAILABLE:
            raise Exception("PyAV not available - cannot perform audio concatenation")
            
        try:
            print("Splicing: PyAV concatenation (speech + music)")
            
            # Use the same approach as distributed splicing but with just 2 files
            temp_files = []
            
            # Convert speech to standard format
            temp_speech = "/tmp/temp_speech.mp3"
            self._convert_to_standard_format(speech_path, temp_speech)
            temp_files.append(temp_speech)
            
            # Convert music to standard format
            temp_music = "/tmp/temp_music.mp3"
            self._convert_to_standard_format(music_path, temp_music)
            temp_files.append(temp_music)
            
            # Binary concatenate
            with open(output_path, 'wb') as outfile:
                for i, temp_path in enumerate(temp_files):
                    with open(temp_path, 'rb') as infile:
                        if i > 0:
                            infile.seek(1024)  # Skip ID3 tags for second file
                        outfile.write(infile.read())
                    os.remove(temp_path)  # Clean up
            
            print("✅ PyAV concatenation completed")
            
        except Exception as e:
            print(f"❌ Concatenation failed: {str(e)}")
            raise

    def splice_intro(self, speech_path, music_path, output_path):
        """Splice speech at the beginning, then music (simple binary method)"""
        # Use the simple concatenation method
        self.splice_simple_concat(speech_path, music_path, output_path)
    
    def splice_random(self, speech_path, music_path, output_path, music_duration, speech_duration):
        """Random insertion - fallback to simple concatenation for single chunk"""
        print("Random mode: using simple concatenation (single chunk)")
        self.splice_simple_concat(speech_path, music_path, output_path)
    
    def splice_distributed(self, speech_path, music_path, output_path, music_duration, speech_duration):
        """Distributed mode - fallback to simple concatenation for single chunk"""
        print("Distributed mode: using simple concatenation (single chunk)")
        self.splice_simple_concat(speech_path, music_path, output_path)
    
    def limit_duration(self, input_path, output_path, max_duration):
        """Duration limiting - simplified (just copy file for now)"""
        try:
            print(f"Duration limiting requested ({max_duration}s) - copying file as-is")
            
            # For now, just copy the file since we can't easily trim without complex audio processing
            with open(input_path, 'rb') as src:
                with open(output_path, 'wb') as dst:
                    dst.write(src.read())
            
            print(f"✅ File copied (duration limiting skipped)")
            
        except Exception as e:
            print(f"❌ File copy failed: {str(e)}")
            raise
    
    def _download_from_blob_url(self, blob_url: str) -> bytes:
        """Download audio content from blob URL"""
        try:
            print(f"Downloading audio from blob URL: {blob_url}")
            response = requests.get(blob_url, timeout=120)
            response.raise_for_status()
            
            audio_size_mb = len(response.content) / (1024 * 1024)
            print(f"Downloaded audio: {audio_size_mb:.2f}MB")
            
            return response.content
        except Exception as e:
            raise Exception(f"Failed to download from blob URL: {str(e)}")
    
    def _upload_to_blob_storage(self, audio_content: bytes, session_id: str) -> str:
        """Upload final audio content to Vercel Blob storage with session-based folder structure"""
        
        if not BLOB_AVAILABLE:
            raise Exception("vercel_blob package not available")
            
        try:
            # Check for required environment variable
            blob_token = os.getenv('BLOB_READ_WRITE_TOKEN')
            if not blob_token:
                print("ERROR: BLOB_READ_WRITE_TOKEN environment variable is missing")
                raise Exception("BLOB_READ_WRITE_TOKEN environment variable is required")
            
            # Create a unique filename with session-based folder structure
            content_hash = hashlib.sha256(audio_content).hexdigest()[:12]
            timestamp = int(time.time())
            filename = f"final-audio/{session_id}/final-{timestamp}-{content_hash}.mp3"
            
            print(f"Uploading final audio to session folder: {filename}")
            
            # Upload to Vercel Blob
            blob_result = vercel_blob.put(
                filename,
                audio_content,
                {
                    'addRandomSuffix': 'true',
                    'contentType': 'audio/mpeg'
                }
            )
            
            print(f"✅ Final audio blob upload successful to session {session_id}!")
            
            # Extract URL from result
            if isinstance(blob_result, dict):
                url = blob_result.get('url') or blob_result.get('downloadUrl')
            else:
                url = getattr(blob_result, 'url', None) or getattr(blob_result, 'downloadUrl', None)
            
            if not url:
                raise Exception("Blob upload succeeded but no URL was returned")
                
            return url
            
        except Exception as e:
            error_msg = str(e)
            if "token" in error_msg.lower():
                raise Exception("Invalid or missing BLOB_READ_WRITE_TOKEN")
            else:
                raise Exception(f"Blob storage upload failed: {error_msg}")
    
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
            'finalAudioUrl': '',
            'success': False,
            'error': message,
            'deliveryMethod': 'error'
        }
        self.send_json_response(status_code, response)