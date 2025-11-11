# QuickJS Setup for YouTube Downloads

## Overview

Starting in 2025, YouTube requires a JavaScript runtime to solve JS challenges for video downloads. This project uses **QuickJS** - a lightweight, static JavaScript runtime that works perfectly in Vercel's Python serverless functions.

## Why QuickJS?

- **Tiny footprint**: ~3-6 MB static binary (vs Deno's ~100MB)
- **Stays under Vercel's 250 MB function limit**
- **No dependencies**: Single static binary, no glibc/musl issues
- **Sandboxed**: Safe execution of YouTube's JS challenges
- **Supported by yt-dlp**: Official support via `--js-runtimes quickjs:/path`
- **Official release**: Using QuickJS 2025-09-13 from bellard.org (recommended by yt-dlp)

## Architecture

```
api/
├── _bin/
│   └── qjs              # QuickJS static binary (~3-6 MB)
├── extract-audio.py     # Uses qjs for YouTube downloads
└── ...

yt-dlp → calls qjs → solves YouTube JS → downloads video
```

## Setup Options

### Option 1: Automated GitHub Action (Recommended)

The repo includes a GitHub Action that automatically downloads and commits the QuickJS binary:

1. Go to **Actions** tab in your GitHub repo
2. Select **"Build QuickJS Binary"** workflow
3. Click **"Run workflow"**
4. Wait ~1 minute for completion
5. The binary will be committed to `api/_bin/qjs`

### Option 2: Manual Download (Official Binary)

Download the official QuickJS binary from bellard.org (version 2025-09-13):

```bash
# Download official QuickJS binary release
wget https://bellard.org/quickjs/binary_releases/quickjs-linux-x86_64-2025-09-13.zip

# Extract the ZIP file
unzip quickjs-linux-x86_64-2025-09-13.zip

# Copy binary to your project
cp quickjs-linux-x86_64-2025-09-13/qjs api/_bin/qjs

# Make executable
chmod +x api/_bin/qjs

# Test it
./api/_bin/qjs --help
```

**Note**: This is the official 2025-09-13 release from Fabrice Bellard (QuickJS creator), which exceeds yt-dlp's minimum requirement of `2023-12-9` and is strongly recommended for performance.

### Option 3: Build from Source

If you need a custom build:

```bash
# Clone QuickJS
git clone https://github.com/bellard/quickjs.git
cd quickjs

# Build static binary
make CONFIG_STATIC=y

# Copy to project
cp qjs /path/to/your/project/api/_bin/qjs
chmod +x /path/to/your/project/api/_bin/qjs
```

## How It Works

### 1. yt-dlp Configuration

The `extract-audio.py` function automatically detects and uses QuickJS:

```python
# Locate QuickJS binary
qjs_path = os.path.join(os.path.dirname(__file__), '_bin', 'qjs')

# Configure yt-dlp to use QuickJS for JS challenges
base_opts = {
    'external_downloader_args': {
        'default': ['--js-runtimes', f'quickjs:{qjs_path}']
    },
    # ... other options
}
```

### 2. YouTube JS Challenge Flow

```
1. User requests YouTube video
2. yt-dlp fetches player JS
3. YouTube requires solving JS challenge (n parameter/signature)
4. yt-dlp calls QuickJS binary with JS code
5. QuickJS executes JS and returns result
6. yt-dlp uses result to download video
```

### 3. Vercel Build Process

The `vercel.json` buildCommand ensures the binary is executable:

```json
{
  "buildCommand": "chmod +x api/_bin/qjs 2>/dev/null || true && npm run build"
}
```

## Verification

### Local Testing

```bash
# Test QuickJS binary
./api/_bin/qjs --help

# Test with yt-dlp
python3 -m yt_dlp \
  --dump-json \
  --js-runtimes quickjs:./api/_bin/qjs \
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### Vercel Deployment

After deploying, check the function logs:

```
✅ QuickJS binary found at /var/task/api/_bin/qjs
Trying download strategy: web_with_cookies
✅ Successfully downloaded audio
```

If you see:
```
⚠️ QuickJS binary not found, YouTube downloads may fail
```

Then the binary wasn't included or isn't executable.

## Troubleshooting

### Binary Not Found

**Symptom**: `⚠️ QuickJS binary not found at /var/task/api/_bin/qjs`

**Solutions**:
1. Ensure `api/_bin/qjs` exists in your repo
2. Check it's committed to git: `git ls-files api/_bin/qjs`
3. Verify it's executable: `ls -la api/_bin/qjs`
4. Re-run the GitHub Action to download it

### Permission Denied

**Symptom**: `Permission denied: /var/task/api/_bin/qjs`

**Solutions**:
1. Ensure buildCommand includes: `chmod +x api/_bin/qjs`
2. Check file permissions locally: `chmod +x api/_bin/qjs`
3. Commit the permission change: `git add api/_bin/qjs && git commit -m "Fix qjs permissions"`

### Binary Too Large

**Symptom**: Vercel function exceeds 250 MB limit

**Solutions**:
1. QuickJS should only be ~3-5 MB, check file size: `ls -lh api/_bin/qjs`
2. If using wrong binary, download the official binary from bellard.org (Option 2)
3. Check other dependencies aren't bloating the function

### YouTube Still Failing

**Symptom**: YouTube downloads fail even with QuickJS

**Solutions**:
1. **Update yt-dlp**: Ensure you have latest version with `[default]` extras
2. **Check logs**: Look for QuickJS execution errors in Vercel logs
3. **Try cookies**: YouTube may still require authentication cookies
4. **Test locally**: Verify QuickJS works on your machine first

## Requirements

### Python Dependencies

```txt
# requirements.txt
yt-dlp[default]>=2025.1.1  # Includes yt-dlp-ejs for JS handling
```

The `[default]` extra is **critical** - it includes:
- `yt-dlp-ejs`: JavaScript component extraction and execution
- Other JS handling utilities

### Vercel Configuration

```json
{
  "functions": {
    "api/extract-audio.py": {
      "maxDuration": 300,
      "memory": 1024
    }
  },
  "buildCommand": "chmod +x api/_bin/qjs 2>/dev/null || true && npm run build"
}
```

## Bundle Size

Typical Vercel function bundle with QuickJS:

```
Python runtime:        ~50 MB
yt-dlp + deps:        ~30 MB
QuickJS binary:        ~5 MB
Other dependencies:   ~20 MB
------------------------
Total:               ~105 MB  ✅ Well under 250 MB limit
```

## Future: PO Token Support

YouTube is rolling out Proof-of-Origin (PO) tokens. QuickJS will also handle this:

```python
# Future yt-dlp configuration
base_opts = {
    'js_runtimes': f'quickjs:{qjs_path}',
    'extractor_args': {
        'youtube': {
            'po_token': 'auto',  # QuickJS will generate PO tokens
        }
    }
}
```

## Alternative Runtimes

While QuickJS is recommended, yt-dlp also supports:

- **Node.js** (20.0.0+): Larger but more compatible
- **Bun** (1.0.31+): Fast but less tested
- **Deno** (2.0.0+): Secure but ~100 MB

To use a different runtime, modify the `--js-runtimes` argument:

```python
# Node.js
'--js-runtimes', 'node:/usr/bin/node'

# Deno
'--js-runtimes', 'deno:/usr/bin/deno'
```

However, these may exceed Vercel's bundle size limit.

## References

- [yt-dlp JS Runtime Announcement](https://github.com/yt-dlp/yt-dlp/discussions/14400)
- [yt-dlp PR #14157 (JS Runtime Support)](https://github.com/yt-dlp/yt-dlp/pull/14157)
- [QuickJS Official Site](https://bellard.org/quickjs/)
- [QuickJS Binary Releases](https://bellard.org/quickjs/binary_releases/)
- [Vercel Function Limits](https://vercel.com/docs/functions/runtimes/python)

## Summary

1. **Download QuickJS binary** (via GitHub Action or manually)
2. **Place in `api/_bin/qjs`** and make executable
3. **Deploy to Vercel** - buildCommand handles permissions
4. **YouTube downloads work** - yt-dlp uses QuickJS for JS challenges

The setup is minimal, stays well under Vercel's limits, and future-proofs your YouTube download functionality.
