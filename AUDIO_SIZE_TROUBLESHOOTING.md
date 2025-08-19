# Audio Size Troubleshooting

## HTTP 413 "Payload Too Large" Error

This error occurs when the generated audio file is too large for Vercel's serverless function limits.

### Why This Happens

1. **Long Text**: Longer text generates larger audio files
2. **High Quality Settings**: Higher quality audio takes more space
3. **Certain Voices**: Some voices generate larger files than others
4. **Vercel Limits**: Serverless functions have a ~4.5MB response limit

### Solutions

#### Immediate Fixes:
1. **Shorter Text**: The system automatically chunks text, but very long content can still cause issues
2. **Different Voice**: Try a different ElevenLabs voice (some are more efficient)
3. **Lower Quality**: Use a faster model like `eleven_flash_v2_5` instead of `eleven_multilingual_v2`

#### Automatic Optimizations Applied:
- ✅ **Smaller Chunks**: Text is now chunked into ~100 words instead of 150
- ✅ **Size Checking**: Audio files are checked before sending
- ✅ **Character Limits**: Individual chunks limited to 500 characters
- ✅ **Better Error Messages**: Clear guidance when limits are exceeded

### Technical Details

**Vercel Limits:**
- Response size: ~4.5MB
- Memory: 1024MB (increased for speech generation)
- Timeout: 60 seconds

**Audio Size Factors:**
- Text length: ~1MB per minute of speech
- Voice quality: Higher quality = larger files
- Output format: MP3 is compressed, PCM is larger

### Workarounds

If you continue to get this error:

1. **Try Different Content:**
   - Use shorter motivational messages
   - Break very long content into multiple sessions

2. **Voice Settings:**
   - Use `eleven_flash_v2_5` model (faster, smaller files)
   - Lower quality settings in voice configuration

3. **Alternative Approach:**
   - Generate speech in smaller chunks
   - Combine audio files client-side

### Prevention

To avoid this issue:
- Keep individual text chunks under 400 characters
- Use efficient voice models
- Monitor the "Processing" messages for size warnings

### Error Messages You Might See

- "Generated audio is too large (X.XMB)"
- "Response payload too large"
- "Text too long (X characters). Maximum 500 characters per request"

All of these indicate the same issue: the generated content exceeds size limits.

### If Problems Persist

The app automatically handles chunking and size optimization. If you still encounter issues:

1. Try a completely different YouTube video (shorter background music)
2. Use more concise motivational content
3. Select a different ElevenLabs voice
4. Contact support with the specific error message