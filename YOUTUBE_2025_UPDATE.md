# YouTube 2025 Format & Player Client Update

## Issue Addressed

YouTube has implemented new restrictions that cause:
- **Signature extraction failures** - "Signature extraction failed: Some formats may be missing"
- **SABR streaming enforcement** - "YouTube is forcing SABR streaming for this client"
- **Missing format URLs** - "Some web client https formats have been skipped as they are missing a url"
- **Format unavailability** - "Requested format is not available"

## Root Cause

1. **Web client requires PO tokens** - The web client now requires proof-of-origin tokens for many formats
2. **Signature extraction complexity** - YouTube's player JS has become more complex
3. **SABR streaming** - YouTube forces Server-Assisted Bitrate Reduction for some clients
4. **Format restrictions** - Some clients can't access certain format URLs

## Solution

Updated player client strategy and format selection to prioritize clients that:
- ✅ Don't require signature extraction
- ✅ Don't require PO tokens
- ✅ Avoid SABR streaming issues
- ✅ Have direct access to audio formats

## Changes Made

### 1. Updated Player Client Priority

**Old Strategy (Problematic)**:
```python
player_client: ['web']  # Requires PO tokens, signature extraction
```

**New Strategy (Optimized)**:
```python
# Priority order:
1. android_sdkless  # Best for audio, no signatures
2. ios              # No signatures, wide compatibility
3. android          # Reliable, no signatures
4. tv               # Bypasses some restrictions
5. tv_embedded      # Age-restricted content
6. web_safari       # With cookies if provided
7. multi-client     # Let yt-dlp choose best
```

### 2. Improved Format Selection

**Old Format**:
```python
'format': 'bestaudio/best'
```

**New Format**:
```python
'format': 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best[height<=480]/best'
```

**Benefits**:
- Prioritizes audio-only formats (smaller, faster)
- Prefers m4a and webm (better compatibility)
- Falls back to low-res video if needed
- Avoids high-bandwidth formats that trigger SABR

### 3. Client-Specific Advantages

#### Android SDK-less (`android_sdkless`)
- ✅ No signature extraction required
- ✅ Direct audio format access
- ✅ Avoids SABR streaming
- ✅ Best for audio-only downloads
- ✅ Works without authentication

#### iOS (`ios`)
- ✅ No signature extraction required
- ✅ Wide format compatibility
- ✅ Works for most videos
- ✅ Good fallback option

#### Android (`android`)
- ✅ No signature extraction required
- ✅ Reliable and stable
- ✅ Good format selection

#### TV (`tv`)
- ✅ Bypasses some restrictions
- ✅ Good for region-locked content
- ✅ No PO token required

#### TV Embedded (`tv_embedded`)
- ✅ Works for age-restricted videos
- ✅ No authentication required
- ✅ Embeddable content access

#### Web Safari (`web_safari`)
- ✅ Uses cookies if provided
- ✅ Good compatibility
- ✅ Fallback for authenticated content

## Technical Details

### Format Selection Breakdown

```python
format_selector = 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best[height<=480]/best'
```

This selector means:
1. **First choice**: Best audio-only in m4a format (AAC codec, widely compatible)
2. **Second choice**: Best audio-only in webm format (Opus codec, high quality)
3. **Third choice**: Best audio-only in any format
4. **Fourth choice**: Best combined format with video ≤480p (smaller file)
5. **Last resort**: Best available format

### Why This Works

1. **Audio-only formats**:
   - Smaller file sizes (faster download)
   - No video processing overhead
   - Direct access without SABR
   - Better for audio extraction

2. **Client priority**:
   - Clients that don't require signatures work immediately
   - No need for complex JS execution
   - Faster and more reliable
   - Less prone to YouTube changes

3. **Multiple fallbacks**:
   - If one client fails, try next
   - Different clients have different format access
   - Maximizes success rate

## Expected Behavior

### Before Update
```
Trying download strategy: web_with_cookies
WARNING: Signature extraction failed
WARNING: Some web client formats have been skipped
ERROR: Requested format is not available
```

### After Update
```
Trying download strategy: android_sdkless
✅ Successfully downloaded audio
   Duration: 8.5 minutes
   Size: 8.23MB
```

## Compatibility

### Works With
- ✅ Public videos
- ✅ Unlisted videos
- ✅ Age-restricted videos (with tv_embedded)
- ✅ Region-locked videos (with tv client)
- ✅ Music videos
- ✅ Live streams (after they end)

### May Require Cookies
- ⚠️ Private videos (need access)
- ⚠️ Premium content (need subscription)
- ⚠️ Some age-restricted content

### Won't Work
- ❌ Deleted videos
- ❌ Copyright-blocked videos
- ❌ Private videos without access

## Testing

Test with various video types:

```python
# Regular video
url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Music video
url = "https://www.youtube.com/watch?v=f-xKKx5eVZg"

# Age-restricted
url = "https://www.youtube.com/watch?v=..."  # (with tv_embedded)
```

## Troubleshooting

### Still Getting Signature Errors?

**Solution**: The new client priority should avoid this. If it persists:
1. Update yt-dlp: `pip install -U yt-dlp[default]`
2. Ensure QuickJS binary is in place
3. Check Vercel logs for which strategy succeeded

### "Only images are available"?

**Solution**: This means all format strategies failed. Try:
1. Different video (some videos have restricted formats)
2. Upload YouTube cookies
3. Check if video is region-locked

### SABR Streaming Warning?

**Solution**: The new format selector avoids this. If you see it:
- It's just a warning, download should still work
- The android_sdkless client avoids SABR
- Format fallback will find working format

## Performance Impact

### Download Speed
- ✅ **Faster**: Audio-only formats are smaller
- ✅ **More reliable**: No signature extraction delays
- ✅ **Better success rate**: Multiple client fallbacks

### File Size
- ✅ **Smaller**: Audio-only formats (3-10 MB for 5-min song)
- ✅ **Better quality**: m4a/webm audio codecs
- ✅ **Efficient**: No unnecessary video data

## Future-Proofing

This update prepares for:
- ✅ **PO token requirements** - Clients that don't need them
- ✅ **Signature changes** - Clients that don't need signatures
- ✅ **Format restrictions** - Multiple format fallbacks
- ✅ **Client deprecation** - Multiple client options

## References

- [yt-dlp Format Selection](https://github.com/yt-dlp/yt-dlp#format-selection)
- [YouTube Player Clients](https://github.com/yt-dlp/yt-dlp#youtube)
- [SABR Streaming Issue](https://github.com/yt-dlp/yt-dlp/issues/12482)
- [Signature Extraction](https://github.com/yt-dlp/yt-dlp/discussions/14400)

## Summary

The update prioritizes YouTube player clients that:
1. Don't require signature extraction (android_sdkless, ios, android)
2. Don't require PO tokens (non-web clients)
3. Have direct audio format access
4. Avoid SABR streaming issues

Combined with improved format selection, this provides:
- ✅ Higher success rate
- ✅ Faster downloads
- ✅ Better reliability
- ✅ Future-proof approach

---

**All changes are backward compatible and improve download success rates for 2025 YouTube requirements.**
