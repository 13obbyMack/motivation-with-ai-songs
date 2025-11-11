# QuickJS Setup - Quick Start

## TL;DR

YouTube now requires a JavaScript runtime. We're using QuickJS (~5 MB) instead of Deno (~100 MB) to stay under Vercel's limits.

## Setup (Choose One)

### Option 1: GitHub Action (Easiest)
1. Go to **Actions** tab
2. Run **"Build QuickJS Binary"** workflow
3. Wait ~1 minute
4. Binary auto-commits to `api/_bin/qjs`
5. Deploy to Vercel

### Option 2: Download Script
```bash
# Linux/Mac
./scripts/download-quickjs.sh

# Windows
powershell -ExecutionPolicy Bypass -File scripts/download-quickjs.ps1

# Then commit and deploy
git add api/_bin/qjs
git commit -m "Add QuickJS for YouTube"
git push
```

### Option 3: Manual
```bash
wget https://bellard.org/quickjs/binary_releases/quickjs-linux-x86_64-2025-09-13.zip
unzip quickjs-linux-x86_64-2025-09-13.zip
cp quickjs-linux-x86_64-2025-09-13/qjs api/_bin/qjs
chmod +x api/_bin/qjs
git add api/_bin/qjs
git commit -m "Add QuickJS"
git push
```

## Verify

After deploying, check Vercel logs for:
```
✅ QuickJS binary found at /var/task/api/_bin/qjs
   Configured yt-dlp to use QuickJS for JS challenges
```

## What Changed?

- `api/extract-audio.py` - Now uses QuickJS for YouTube JS challenges
- `requirements.txt` - Updated to `yt-dlp[default]` (includes JS components)
- `vercel.json` - BuildCommand makes QuickJS executable
- `api/_bin/qjs` - QuickJS binary (you need to add this)

## Why?

YouTube is rolling out JS challenges that require a real JS runtime. QuickJS is:
- Tiny (5 MB vs Deno's 100 MB)
- Static binary (no dependencies)
- Officially supported by yt-dlp
- Stays under Vercel's 250 MB limit

## Full Docs

See `QUICKJS_SETUP.md` for complete documentation.

## Troubleshooting

**Binary not found?**
→ Run download script or GitHub Action

**Permission denied?**
→ Run `chmod +x api/_bin/qjs` before committing

**YouTube still failing?**
→ This is YouTube blocking, not QuickJS. Try uploading cookies or different video.

## That's It!

Just add the binary, commit, and deploy. YouTube downloads will work with the new JS requirements.
