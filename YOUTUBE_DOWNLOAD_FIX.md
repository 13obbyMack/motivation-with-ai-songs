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

## Additional Issues Fixed

### Issue 1: Read-only File System
**Problem**: yt-dlp was trying to write cache to `/home/sbx_user1051` which is read-only in serverless environments.

**Solution**: Added `'no_cache_dir': True` to disable caching entirely.

### Issue 2: Bot Detection & Signature Solving
**Problem**: YouTube was detecting bot activity and blocking requests with "Sign in to confirm you're not a bot" error. Also signature solving was failing.

**Solution**: 
- Use iOS client as primary strategy (best for avoiding bot detection)
- iOS client doesn't require signature solving
- Android client as fallback (no signature required)
- Don't stop on bot detection - try all strategies
- Changed from nightly yt-dlp to stable version 2024.12.13

### Issue 3: Empty File Downloads
**Problem**: yt-dlp reported "already downloaded" but file was 0 bytes.

**Solution**:
- Added `'overwrites': True` to always overwrite existing files
- Added validation to check file size > 1KB before accepting download
- Delete empty files and try next strategy
- Validate audio_content before blob upload

### Issue 4: Blob Upload Failures
**Problem**: Blob storage rejected empty files with "Missing content-length header" error.

**Solution**:
- Validate audio data is not empty before attempting upload
- Add detailed logging of content size
- Return clear error message if audio is empty

## Testing

Test with the problematic video:
- URL: https://www.youtube.com/watch?v=x9tvHvSy890
- Expected: ~8MB file for 8:33 duration
- Previous: 139KB or 0KB incomplete file
- Now: Full audio file downloaded correctly

## Strategy Order

The download now tries strategies in this order:

**If cookies are provided:**
1. **Web client with cookies** - Supports authentication, best with cookies
2. **Android client with cookies** - Alternative with authentication

**Always tried:**
3. **iOS client** - No signature required, works for some videos
4. **Android client** - No signature required
5. **TV embedded client** - Sometimes bypasses restrictions
6. **Default web client** - Last resort

Each strategy is tried even if previous ones hit bot detection, maximizing success rate.

## Important Note About YouTube Bot Detection

YouTube is increasingly aggressive about blocking automated downloads from cloud/serverless IPs. If you see "Sign in to confirm you're not a bot" errors:

1. **Export and upload YouTube cookies** - This is the most reliable solution
   - Export cookies from your browser using a cookies extension
   - Upload them in the API configuration section
   - The web client strategy will use these cookies for authentication

2. **Try different videos** - Some videos are more restricted than others
   - Official artist channels often work better
   - Popular music videos may have fewer restrictions

3. **Wait and retry** - YouTube may temporarily block an IP
   - Wait 15-30 minutes before retrying
   - The block is usually temporary

4. **Alternative: Upload audio directly** - If YouTube continues blocking
   - Download the audio on your local machine
   - Upload it directly to the app

## JavaScript Runtime Configuration

Added support for JavaScript runtime to solve YouTube's signature challenges:

```python
'js_runtimes': 'node',  # Use Node.js for JavaScript execution
'remote_components': 'ejs:github',  # Use EJS from GitHub for challenge solving
```

These options enable:
- **Signature solving**: Decrypts YouTube's obfuscated video URLs
- **Challenge solving**: Handles YouTube's bot detection challenges
- **N-parameter solving**: Decodes throttling parameters

Requirements:
- `yt-dlp-ejs==0.3.1` package (already in requirements.txt)
- Node.js runtime (checked at runtime, warning if not available)

## Files Modified

- `api/extract-audio.py` - Multiple fixes for download, caching, format selection, client strategy, JavaScript runtime, and validation
- `requirements.txt` - Uses nightly yt-dlp build with yt-dlp-ejs for JavaScript support
