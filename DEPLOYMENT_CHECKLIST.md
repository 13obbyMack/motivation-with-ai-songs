# Deployment Checklist - QuickJS Setup

Use this checklist to ensure QuickJS is properly set up before deploying to Vercel.

## Pre-Deployment Checklist

### ✅ Step 1: Download QuickJS Binary

Choose **ONE** of these methods:

- [ ] **Option A**: Run GitHub Action
  - Go to Actions tab
  - Select "Build QuickJS Binary"
  - Click "Run workflow"
  - Wait for completion (~1 minute)
  - Binary auto-commits to repo

- [ ] **Option B**: Run download script
  ```bash
  # Linux/Mac
  ./scripts/download-quickjs.sh
  
  # Windows
  powershell -ExecutionPolicy Bypass -File scripts/download-quickjs.ps1
  ```

- [ ] **Option C**: Manual download
  ```bash
  wget https://bellard.org/quickjs/binary_releases/quickjs-linux-x86_64-2025-09-13.zip
  unzip quickjs-linux-x86_64-2025-09-13.zip
  cp quickjs-linux-x86_64-2025-09-13/qjs api/_bin/qjs
  chmod +x api/_bin/qjs
  ```

### ✅ Step 2: Verify Binary

- [ ] File exists: `ls api/_bin/qjs`
- [ ] File size is 3-6 MB: `ls -lh api/_bin/qjs`
- [ ] File is executable: `ls -la api/_bin/qjs` (should show `-rwxr-xr-x`)

### ✅ Step 3: Commit to Git

- [ ] Add binary: `git add api/_bin/qjs`
- [ ] Commit: `git commit -m "Add QuickJS binary for YouTube downloads"`
- [ ] Verify it's tracked: `git ls-files api/_bin/qjs`
- [ ] Push to GitHub: `git push`

### ✅ Step 4: Verify Code Changes

- [ ] `requirements.txt` has `yt-dlp[default]>=2025.1.1`
- [ ] `vercel.json` buildCommand includes `chmod +x api/_bin/qjs`
- [ ] `api/extract-audio.py` has QuickJS detection code

### ✅ Step 5: Deploy to Vercel

- [ ] Deploy: `vercel --prod` or push to main branch
- [ ] Wait for deployment to complete
- [ ] Check deployment logs

### ✅ Step 6: Verify Deployment

Check Vercel function logs for these messages:

- [ ] `✅ QuickJS binary found at /var/task/api/_bin/qjs`
- [ ] `Configured yt-dlp to use QuickJS for JS challenges`

### ✅ Step 7: Test YouTube Download

- [ ] Open your deployed app
- [ ] Try downloading a YouTube video
- [ ] Verify it completes successfully
- [ ] Check logs for any errors

## Quick Verification Commands

```bash
# Check binary exists
ls -lh api/_bin/qjs

# Check binary is tracked in git
git ls-files api/_bin/qjs

# Check binary is executable
stat -c "%a %n" api/_bin/qjs  # Linux
stat -f "%Sp %N" api/_bin/qjs  # Mac

# Test locally (Linux only)
./api/_bin/qjs --help
```

## Expected Output

### Binary File Info
```
-rwxr-xr-x  1 user  group  5.2M  Nov 11 12:00 api/_bin/qjs
```

### Vercel Deployment Logs
```
✅ QuickJS binary found at /var/task/api/_bin/qjs
   Configured yt-dlp to use QuickJS for JS challenges
Trying download strategy: web_with_cookies
✅ Successfully downloaded audio
```

## Troubleshooting

### ❌ Binary not found in deployment

**Problem**: Vercel logs show `⚠️ QuickJS binary not found`

**Solutions**:
1. Verify binary is committed: `git ls-files api/_bin/qjs`
2. Check file size: `ls -lh api/_bin/qjs`
3. Re-add and commit: `git add -f api/_bin/qjs && git commit -m "Add QuickJS" && git push`

### ❌ Permission denied

**Problem**: Vercel logs show `Permission denied: /var/task/api/_bin/qjs`

**Solutions**:
1. Make executable: `chmod +x api/_bin/qjs`
2. Commit: `git add api/_bin/qjs && git commit -m "Fix permissions" && git push`
3. Verify buildCommand in `vercel.json` includes `chmod +x api/_bin/qjs`

### ❌ File too large

**Problem**: Binary is > 10 MB

**Solutions**:
1. You downloaded the wrong version
2. Use the official binary from bellard.org (see Step 1)
3. Expected size: 3-5 MB

### ❌ YouTube downloads still failing

**Problem**: Downloads fail even with QuickJS

**Possible Causes**:
1. **YouTube blocking**: Try uploading cookies or different video
2. **yt-dlp outdated**: Ensure `requirements.txt` has latest version
3. **QuickJS not being used**: Check logs for "Configured yt-dlp to use QuickJS"

## Files Modified

This implementation modified the following files:

- ✅ `api/extract-audio.py` - Added QuickJS detection and configuration
- ✅ `requirements.txt` - Updated to `yt-dlp[default]>=2025.1.1`
- ✅ `vercel.json` - Added `chmod +x api/_bin/qjs` to buildCommand
- ✅ `.gitignore` - Uncommented `.github/` and `scripts/` to keep them
- ✅ `README.md` - Added QuickJS setup instructions

## New Files Added

- ✅ `api/_bin/.gitkeep` - Placeholder for binary directory
- ✅ `api/_bin/README.md` - Binary directory documentation
- ✅ `.github/workflows/build-quickjs.yml` - Automated binary download
- ✅ `scripts/download-quickjs.sh` - Linux/Mac download script
- ✅ `scripts/download-quickjs.ps1` - Windows download script
- ✅ `scripts/test-quickjs.py` - Test script
- ✅ `QUICKJS_SETUP.md` - Comprehensive setup guide
- ✅ `QUICKSTART.md` - Quick reference guide
- ✅ `IMPLEMENTATION_SUMMARY.md` - Technical details
- ✅ `DEPLOYMENT_CHECKLIST.md` - This file

## Success Criteria

Your deployment is successful when:

1. ✅ Binary exists in `api/_bin/qjs` (3-6 MB)
2. ✅ Binary is committed to git
3. ✅ Vercel logs show "QuickJS binary found"
4. ✅ YouTube downloads work in production
5. ✅ No "binary not found" errors in logs

## Next Steps After Deployment

1. Monitor Vercel function logs for any issues
2. Test with various YouTube videos
3. If issues persist, check `QUICKJS_SETUP.md` troubleshooting section
4. Consider adding YouTube cookies for restricted content

## Support

If you encounter issues:

1. Check `QUICKJS_SETUP.md` for detailed troubleshooting
2. Review Vercel function logs for specific errors
3. Verify all checklist items are completed
4. Ensure you're using the latest yt-dlp version

---

**Ready to deploy?** Start with Step 1 and work through the checklist! 🚀
