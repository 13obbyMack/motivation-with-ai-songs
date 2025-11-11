# QuickJS Visual Setup Guide

## 📋 What You Need to Know

```
┌─────────────────────────────────────────────────────────────┐
│  YouTube (2025+) requires JavaScript runtime for downloads  │
│                                                              │
│  Solution: QuickJS (~5 MB) instead of Deno (~100 MB)       │
│                                                              │
│  Result: Stays under Vercel's 250 MB function limit ✅      │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Quick Setup (3 Steps)

```
Step 1: Download Binary          Step 2: Commit           Step 3: Deploy
┌──────────────────┐            ┌──────────────┐         ┌──────────────┐
│ GitHub Action    │            │ git add      │         │ vercel --prod│
│ OR               │  ────────> │ git commit   │  ─────> │ OR           │
│ Download Script  │            │ git push     │         │ git push     │
└──────────────────┘            └──────────────┘         └──────────────┘
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Vercel App                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Request                                                   │
│      ↓                                                          │
│  extract-audio.py                                               │
│      ↓                                                          │
│  Detect QuickJS at api/_bin/qjs                                │
│      ↓                                                          │
│  Configure yt-dlp with js_runtime parameter                    │
│      ↓                                                          │
│  yt-dlp fetches YouTube video                                  │
│      ↓                                                          │
│  YouTube returns JS challenge (n parameter/signature)          │
│      ↓                                                          │
│  yt-dlp calls QuickJS binary                                   │
│      ↓                                                          │
│  QuickJS executes JS and returns solution                      │
│      ↓                                                          │
│  yt-dlp downloads video with solved challenge                  │
│      ↓                                                          │
│  Return audio to user                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
your-project/
│
├── api/
│   ├── _bin/
│   │   ├── .gitkeep              ← Placeholder
│   │   ├── README.md             ← Binary documentation
│   │   └── qjs                   ← QuickJS binary (YOU ADD THIS)
│   │                                ~5 MB, Linux executable
│   │
│   └── extract-audio.py          ← Updated with QuickJS support
│
├── .github/
│   └── workflows/
│       └── build-quickjs.yml     ← Automated download workflow
│
├── scripts/
│   ├── download-quickjs.sh       ← Linux/Mac download script
│   ├── download-quickjs.ps1      ← Windows download script
│   └── test-quickjs.py           ← Test script
│
├── requirements.txt              ← Updated: yt-dlp[default]>=2025.1.1
├── vercel.json                   ← Updated: chmod +x in buildCommand
│
└── Documentation:
    ├── QUICKSTART.md             ← Start here! Quick reference
    ├── QUICKJS_SETUP.md          ← Comprehensive guide
    ├── DEPLOYMENT_CHECKLIST.md   ← Step-by-step checklist
    ├── IMPLEMENTATION_SUMMARY.md ← Technical details
    └── QUICKJS_VISUAL_GUIDE.md   ← This file
```

## 🚀 Setup Methods Comparison

```
┌────────────────────┬──────────────┬──────────────┬─────────────┐
│ Method             │ Difficulty   │ Time         │ Automation  │
├────────────────────┼──────────────┼──────────────┼─────────────┤
│ GitHub Action      │ ⭐ Easy      │ ~1 minute    │ ✅ Full     │
│ Download Script    │ ⭐⭐ Medium  │ ~2 minutes   │ ⚠️  Partial │
│ Manual Download    │ ⭐⭐⭐ Hard  │ ~5 minutes   │ ❌ None     │
└────────────────────┴──────────────┴──────────────┴─────────────┘

Recommendation: Use GitHub Action for easiest setup
```

## 📊 Bundle Size Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Function Bundle                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Python Runtime         ████████████████░░░░░░  ~50 MB     │
│  yt-dlp + Dependencies  ██████████░░░░░░░░░░░░  ~30 MB     │
│  QuickJS Binary         ██░░░░░░░░░░░░░░░░░░░░   ~5 MB     │
│  Other Dependencies     ██████░░░░░░░░░░░░░░░░  ~20 MB     │
│                                                             │
│  Total: ~105 MB                                             │
│  Limit: 250 MB                                              │
│  Remaining: 145 MB ✅                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Deployment Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Deployment Process                        │
└──────────────────────────────────────────────────────────────┘

Local Development
    │
    ├─ Download QuickJS binary
    │  └─ Place in api/_bin/qjs
    │
    ├─ Commit to Git
    │  └─ git add api/_bin/qjs
    │  └─ git commit -m "Add QuickJS"
    │  └─ git push
    │
    ↓
GitHub Repository
    │
    ├─ Vercel detects push
    │
    ↓
Vercel Build Process
    │
    ├─ Run buildCommand
    │  └─ chmod +x api/_bin/qjs
    │  └─ npm run build
    │
    ├─ Install Python dependencies
    │  └─ pip install -r requirements.txt
    │  └─ Installs yt-dlp[default] with JS components
    │
    ├─ Bundle function
    │  └─ Includes api/_bin/qjs
    │  └─ Total size: ~105 MB ✅
    │
    ↓
Vercel Production
    │
    ├─ Function starts
    │  └─ Detects QuickJS at /var/task/api/_bin/qjs
    │  └─ Configures yt-dlp with js_runtime
    │
    ├─ User requests YouTube download
    │  └─ yt-dlp uses QuickJS for JS challenges
    │  └─ Download succeeds ✅
    │
    ↓
Success! 🎉
```

## ✅ Verification Checklist

```
Before Deployment:
  ☐ Binary exists: api/_bin/qjs
  ☐ Binary size: 3-6 MB
  ☐ Binary is executable (chmod +x)
  ☐ Binary is committed to git
  ☐ requirements.txt has yt-dlp[default]
  ☐ vercel.json has chmod in buildCommand

After Deployment:
  ☐ Vercel logs show "QuickJS binary found"
  ☐ Vercel logs show "Configured yt-dlp to use QuickJS"
  ☐ YouTube downloads work
  ☐ No "binary not found" errors
```

## 🎯 Success Indicators

```
✅ GOOD - Deployment Successful
┌─────────────────────────────────────────────────────────┐
│ Vercel Logs:                                            │
│                                                         │
│ ✅ QuickJS binary found at /var/task/api/_bin/qjs      │
│    Configured yt-dlp to use QuickJS for JS challenges  │
│ Trying download strategy: web_with_cookies             │
│ ✅ Successfully downloaded audio                        │
│    Duration: 8.5 minutes                               │
│    Size: 8.23MB                                        │
└─────────────────────────────────────────────────────────┘

❌ BAD - Binary Missing
┌─────────────────────────────────────────────────────────┐
│ Vercel Logs:                                            │
│                                                         │
│ ⚠️ QuickJS binary not found at /var/task/api/_bin/qjs  │
│    YouTube downloads may fail                          │
│ ❌ YouTube extraction failed                            │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Troubleshooting Decision Tree

```
YouTube download failing?
    │
    ├─ Check Vercel logs
    │
    ├─ See "QuickJS binary not found"?
    │   │
    │   ├─ YES → Binary not deployed
    │   │   │
    │   │   ├─ Check: git ls-files api/_bin/qjs
    │   │   ├─ If not listed → Add and commit
    │   │   └─ If listed → Check file size (should be 3-6 MB)
    │   │
    │   └─ NO → Continue
    │
    ├─ See "Permission denied"?
    │   │
    │   ├─ YES → Binary not executable
    │   │   │
    │   │   ├─ Run: chmod +x api/_bin/qjs
    │   │   ├─ Commit and push
    │   │   └─ Verify buildCommand has chmod
    │   │
    │   └─ NO → Continue
    │
    ├─ See "Sign in to confirm you're not a bot"?
    │   │
    │   ├─ YES → YouTube blocking (not QuickJS issue)
    │   │   │
    │   │   ├─ Try uploading YouTube cookies
    │   │   ├─ Try different video
    │   │   └─ Wait 15-30 minutes
    │   │
    │   └─ NO → Continue
    │
    └─ Other error?
        │
        └─ Check QUICKJS_SETUP.md troubleshooting section
```

## 📚 Documentation Quick Reference

```
┌────────────────────────┬─────────────────────────────────┐
│ Document               │ Use When...                     │
├────────────────────────┼─────────────────────────────────┤
│ QUICKSTART.md          │ You want to get started fast    │
│ QUICKJS_SETUP.md       │ You need detailed instructions  │
│ DEPLOYMENT_CHECKLIST   │ You're ready to deploy          │
│ IMPLEMENTATION_SUMMARY │ You want technical details      │
│ QUICKJS_VISUAL_GUIDE   │ You prefer visual explanations  │
└────────────────────────┴─────────────────────────────────┘
```

## 🎓 Key Concepts

### Why QuickJS?
```
┌──────────────┬──────────┬──────────────┬─────────────┐
│ Runtime      │ Size     │ Vercel Fit   │ yt-dlp      │
├──────────────┼──────────┼──────────────┼─────────────┤
│ QuickJS      │ ~5 MB    │ ✅ Perfect   │ ✅ Supported│
│ Deno         │ ~100 MB  │ ⚠️  Tight    │ ✅ Supported│
│ Node.js      │ ~50 MB   │ ✅ Good      │ ✅ Supported│
│ Bun          │ ~50 MB   │ ✅ Good      │ ✅ Supported│
└──────────────┴──────────┴──────────────┴─────────────┘

Winner: QuickJS (smallest, simplest, perfect for Vercel)
```

### What Does QuickJS Do?
```
YouTube Player JS (obfuscated)
    ↓
yt-dlp extracts JS challenge
    ↓
QuickJS executes JS code
    ↓
Returns solution (n parameter/signature)
    ↓
yt-dlp uses solution to download video
```

### Future: PO Token Support
```
Current (2025):
  YouTube JS challenges → QuickJS solves → Download works

Future (2025+):
  YouTube PO tokens → QuickJS generates → Download works

Your setup is future-proof! ✅
```

## 🎉 Success Path

```
1. Read QUICKSTART.md
   ↓
2. Download QuickJS binary (GitHub Action recommended)
   ↓
3. Commit to git
   ↓
4. Deploy to Vercel
   ↓
5. Check logs for "QuickJS binary found"
   ↓
6. Test YouTube download
   ↓
7. Success! 🎉

Total time: ~5 minutes
```

## 💡 Pro Tips

```
✅ DO:
  • Use GitHub Action for easiest setup
  • Commit the binary to git
  • Check Vercel logs after deployment
  • Keep yt-dlp updated with [default] extras

❌ DON'T:
  • Forget to chmod +x the binary
  • Use Deno (too large for Vercel)
  • Skip the [default] extras in requirements.txt
  • Ignore Vercel function logs
```

## 🔗 Quick Links

- **Start Here**: `QUICKSTART.md`
- **Full Guide**: `QUICKJS_SETUP.md`
- **Deploy**: `DEPLOYMENT_CHECKLIST.md`
- **Technical**: `IMPLEMENTATION_SUMMARY.md`

---

**Ready to set up QuickJS?** Start with `QUICKSTART.md`! 🚀
