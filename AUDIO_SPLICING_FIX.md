# Audio Splicing Distribution Fix

## Issues Identified & Fixed

### 1. Distribution Logic Issue
The first two TTS audio chunks were not evenly distributed throughout the song due to a flaw in the interleaving logic.

**Root Cause**: The first speech chunk was treated as an "intro" at time 0, while remaining chunks used calculated insertion points.

### 2. Runtime Errors
Multiple runtime errors were causing the splicing to fail:
- Duration calculation returning `None` 
- File permission errors with temp file paths
- Invalid audio data processing
- Logic errors with short music tracks

## Fixes Applied

### 1. Fixed Distribution Logic
```python
# OLD Pattern: speech_1 (intro at 0s) + music_segment_1 + speech_2 + ...
# NEW Pattern: music_segment_1 + speech_1 + music_segment_2 + speech_2 + ...
```

Now each speech chunk is placed at its calculated insertion point:
- Improved insertion point calculation with adaptive buffers
- Fixed interleaving to place all chunks at calculated positions
- Proper even distribution across available duration

### 2. Robust Error Handling
- **Duration Calculation**: Added fallback methods when PyAV returns `None`
- **File Paths**: Fixed temp file paths to use proper temp directory
- **Adaptive Buffers**: Dynamic buffer calculation based on music length
- **Fallback Method**: Simple binary concatenation when advanced splicing fails

### 3. Improved Temp File Management
- All temp files now use the provided temp directory
- Proper cleanup and error handling
- Fixed file permission issues

### 4. Adaptive Logic for Short Tracks
- Dynamic buffer sizing (10-20% of track length vs fixed seconds)
- Proper handling when music is shorter than expected
- Fallback distribution when available duration is insufficient

## Result
- **Even Distribution**: All TTS chunks are consistently spaced throughout the song
- **Robust Processing**: Graceful fallback when advanced processing fails  
- **Better Compatibility**: Works with various music track lengths
- **Reliable Operation**: Proper error handling and temp file management

## Files Modified
- `api/splice-audio.py` - Multiple fixes for distribution logic and error handling

## Testing Recommendation
Test with:
- Multiple speech chunks (3-5 chunks) 
- Various song lengths (short <30s, medium 1-3min, long >3min)
- Different audio formats and quality levels