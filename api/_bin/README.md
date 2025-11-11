# QuickJS Binary Directory

This directory contains the QuickJS JavaScript runtime binary required for YouTube downloads.

## What is QuickJS?

QuickJS is a small, embeddable JavaScript engine that yt-dlp uses to solve YouTube's JavaScript challenges.

## Setup

The `qjs` binary should be placed in this directory. You can obtain it using:

### Option 1: GitHub Action (Recommended)
1. Go to the **Actions** tab in your GitHub repository
2. Run the **"Build QuickJS Binary"** workflow
3. The binary will be automatically downloaded and committed

### Option 2: Download Script
```bash
# Linux/Mac
./scripts/download-quickjs.sh

# Windows
powershell -ExecutionPolicy Bypass -File scripts/download-quickjs.ps1
```

### Option 3: Manual Download
```bash
wget https://bellard.org/quickjs/binary_releases/quickjs-linux-x86_64-2025-09-13.zip
unzip quickjs-linux-x86_64-2025-09-13.zip
cp quickjs-linux-x86_64-2025-09-13/qjs api/_bin/qjs
chmod +x api/_bin/qjs
```

## Expected File

- **File**: `qjs`
- **Size**: ~3-6 MB
- **Type**: Linux ELF 64-bit executable (static)
- **Permissions**: `755` (executable)

## Verification

After adding the binary, verify it's correct:

```bash
# Check file exists
ls -lh api/_bin/qjs

# Should show something like:
# -rwxr-xr-x  1 user  group  5.2M  Nov 11 12:00 qjs

# On Linux, you can test it:
./api/_bin/qjs --help
```

## Important Notes

- **Do NOT delete this directory** - it's required for YouTube downloads
- **The binary must be committed to git** - Vercel needs it for deployment
- **Windows users**: The binary won't run locally (it's Linux-only), but it will work on Vercel
- **File size**: If the binary is much larger than 10 MB, you may have the wrong version

## Troubleshooting

### Binary not found after deployment
- Ensure the file is committed: `git ls-files api/_bin/qjs`
- Check it's executable: `chmod +x api/_bin/qjs`
- Verify it's in the repo: `git add api/_bin/qjs`

### Permission denied
- Run: `chmod +x api/_bin/qjs`
- Commit the change: `git add api/_bin/qjs && git commit -m "Fix qjs permissions"`

### File too large
- You may have downloaded the wrong version
- Use the official binary from bellard.org (see setup options above)
- Expected size: 3-5 MB

## More Information

See the following files for detailed documentation:
- `QUICKSTART.md` - Quick setup guide
- `QUICKJS_SETUP.md` - Comprehensive documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
