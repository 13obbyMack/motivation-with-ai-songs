# YouTube Cookies Export Guide

## Why Do I Need YouTube Cookies?

YouTube blocks automated requests from servers to prevent abuse. By providing your browser's cookies, you authenticate the requests as coming from a real user session.

## How to Export YouTube Cookies

### Method 1: Browser Extension (Recommended)

#### For Chrome:

1. Install [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
2. Go to YouTube.com and make sure you're logged in
3. Click the extension icon
4. Click "Export" for youtube.com
5. Copy the entire content and paste it into the app

#### For Firefox:

1. Install [cookies.txt](https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/)
2. Go to YouTube.com and make sure you're logged in
3. Click the extension icon
4. Export cookies for youtube.com
5. Copy the content and paste it into the app

### Method 2: Manual Export (Advanced)

#### Chrome Developer Tools:

1. Go to YouTube.com
2. Press F12 to open Developer Tools
3. Go to Application tab → Storage → Cookies → https://www.youtube.com
4. Copy all cookie values manually (complex)

## Cookie Format Requirements

Your cookies file must:

- Start with `# Netscape HTTP Cookie File` or `# HTTP Cookie File`
- Be in Netscape format
- Include YouTube authentication cookies

## Example Format:

```
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	FALSE	1234567890	cookie_name	cookie_value
.youtube.com	TRUE	/	TRUE	1234567890	session_token	abc123...
```

## Security Notes

- **Cookies are sensitive**: They contain your login session
- **Keep them private**: Don't share your cookies with others
- **They expire**: You may need to re-export cookies periodically
- **Local storage only**: Cookies are processed locally and not stored on servers

## Troubleshooting

### "Invalid cookies format" error:

- Make sure the file starts with the proper header
- Check that you copied the complete content
- Ensure there are no extra characters or formatting

### "Cookies expired" error:

- Re-export fresh cookies from your browser
- Make sure you're logged into YouTube when exporting

### Still getting blocked:

- Try logging out and back into YouTube
- Clear YouTube cookies and log in again
- Export cookies immediately after logging in

## Alternative Solutions

If cookie export doesn't work:

1. **Try different videos**: Popular music videos work better
2. **Wait and retry**: Blocks are often temporary
3. **Upload audio directly**: Skip YouTube entirely
4. **Use other platforms**: SoundCloud, direct MP3 links

## Privacy & Security

- Cookies are processed locally in your browser
- No cookies are stored on our servers
- Cookies are only used for the YouTube request
- Consider this a temporary workaround for YouTube's restrictions
