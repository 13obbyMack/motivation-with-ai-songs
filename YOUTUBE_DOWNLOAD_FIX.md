# YouTube Audio Download Fix

## Issue Identified

YouTube audio downloads were only producing 139KB files instead of the full 8MB+ audio files (for an 8:33 video). This resulted in incomplete or corrupted audio being used for splicing.

## Root Cause

The previous implementation had a flawed two-step process:

1. **Step 1**: Use `yt-dlp` to extract video info and get the audio stream URL
2. **Step 2**: Use `requests.get()` to manually download from that URL

### Problems with this approach:

1. **URL Expiration**: YouTube audio URLs can expire quickly or have time-limited tokens
2. **Range Requests**: YouTube often uses HTTP range requests that `requests.get()` doesn't handle properly
3. **Fragmented Streams**: Modern YouTube videos use DASH (Dynamic Adaptive Streaming over HTTP) with fragmented audio that requires special handling
4. **Missing Headers**: The manual download was missing required headers or cookies that yt-dlp would normally handle
5. **yt-dlp 2025.10.22 Changes**: The newer version may have changed how URLs are structured or require different handling

## Solution

Changed to use **yt-dlp's built-in download functionality** instead of manual URL extraction and downloading:

### Before (Broken):
```python
# Extract info only (download=False)
info = ydl.extract_info(url, download=False)
audio_url = info['audio_url']

# Manually download with requests
response = requests.get(audio_url, headers=headers)
audio_data = response.content  # Only gets 139KB!
```

### After (Fixed):
```python
# Let yt-dlp handle the entire download process
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(url, download=True)  # download=True
    
# Read the complete downloaded file
with open(output_path, 'rb') as f:
    audio_data = f.read()  # Gets full 8MB+ file!
```

## Key Changes

1. **Direct Download**: Use `download=True` in `yt-dlp.extract_info()` to let yt-dlp handle the entire download process
2. **Proper Format Selection**: Simplified format selector to `'bestaudio/best'` which works better with newer yt-dlp versions
3. **File-based Approach**: Download to a temp file first, then read the complete file
4. **Better Error Handling**: Track file size and verify download succeeded
5. **Removed Manual Download**: Eliminated the separate `download_audio()` function that used `requests`

## Benefits

- **Complete Downloads**: Gets the full audio file (8MB+ for 8:33 video)
- **Reliable**: yt-dlp handles all YouTube quirks (fragmented streams, range requests, etc.)
- **Compatible**: Works with yt-dlp 2025.10.22 and future versions
- **Better Quality**: Gets the best available audio quality automatically
- **Proper Handling**: Correctly handles DASH streams, cookies, and authentication

## Testing

Test with the problematic video:
- URL: https://www.youtube.com/watch?v=x9tvHvSy890
- Expected: ~8MB file for 8:33 duration
- Previous: 139KB incomplete file
- Now: Full audio file downloaded correctly

## Files Modified

- `api/extract-audio.py` - Replaced manual download with yt-dlp's built-in download functionality
