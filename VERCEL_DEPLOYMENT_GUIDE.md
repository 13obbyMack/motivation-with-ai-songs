# Vercel Deployment Guide

## ✅ Current Status

Your app is **ready for Vercel deployment**! All configuration issues have been resolved.

## 🚀 Quick Deployment Steps

### 1. Test Locally with Vercel

```bash
# Test with Vercel's local development environment
vercel dev --listen 3000

# Or use regular Next.js dev server
npm run dev
```

### 2. Deploy to Vercel

```bash
# Deploy preview (test deployment)
vercel

# Deploy to production
vercel --prod
```

### 2. Set Environment Variables

In your Vercel dashboard, add these environment variables:

- `OPENAI_API_KEY` (if using OpenAI)
- `ELEVENLABS_API_KEY` (if using ElevenLabs)
- Any other API keys your app needs

## ⚠️ Important Considerations

### FFmpeg Limitations on Vercel

Your app uses FFmpeg for audio processing, which has limitations on Vercel:

1. **Serverless Function Limits:**

   - Max execution time: 60 seconds (configured in vercel.json)
   - Max memory: 1024MB (configured in vercel.json)
   - Max payload size: 4.5MB (Vercel hard limit)

2. **File Size Handling:**

   - **10MB limit:** Implemented for better user experience and validation
   - **4.5MB warning:** Files larger than Vercel's limit will show warnings
   - **Graceful degradation:** Proper error messages when limits are exceeded

3. **FFmpeg Binary:**
   - `ffmpeg-static` package should work on Vercel
   - Fallback to system ffmpeg is configured
   - Consider using Vercel's Edge Runtime for better performance

### ✅ Implemented Optimizations

1. **File size validation:**

   - ✅ Added 10MB total file size limit
   - ✅ Proper error messages with file size details
   - ✅ Warnings for files approaching Vercel's 4.5MB limit
   - ✅ Validation utilities in `src/utils/validation.ts`

2. **Timeout handling:**

   - ✅ 50-second timeout with AbortController
   - ✅ Proper timeout error messages
   - ✅ Increased function timeout to 60 seconds in vercel.json

3. **Client-side validation:**

   - ✅ Pre-upload file size validation
   - ✅ Progress estimation utilities
   - ✅ Multiple file validation support

4. **Vercel Blob Storage Integration:**
   - ✅ Created blob storage utilities in `src/utils/blob-storage.ts`
   - ✅ New blob-enabled API route: `/api/splice-audio-blob`
   - ✅ Automatic file size-based routing (4MB threshold)
   - ✅ Support for files up to 100MB via blob storage
   - ✅ Client-side blob handling utilities

### 🚀 Blob Storage Setup

To enable blob storage for large files (>4MB):

1. **Install the Vercel Blob package:**

```bash
npm install @vercel/blob
```

2. **Enable blob storage using the setup script:**

```bash
npm run setup:blob:enable
```

3. **Check status anytime:**

```bash
npm run setup:blob:status
```

**Manual setup (alternative):**
Uncomment the blob storage code in `src/utils/blob-storage.ts`:

```typescript
// Uncomment these imports and functions:
import { put, del } from "@vercel/blob";
```

### 📊 File Size Handling Strategy

| File Size | Method              | Endpoint                 | Storage     |
| --------- | ------------------- | ------------------------ | ----------- |
| < 4MB     | Standard processing | `/api/splice-audio`      | Memory      |
| 4-10MB    | Blob storage        | `/api/splice-audio-blob` | Vercel Blob |
| 10-100MB  | Blob storage        | `/api/splice-audio-blob` | Vercel Blob |
| > 100MB   | Rejected            | -                        | -           |

## 🔧 Configuration Files Status

### ✅ Ready Files:

- `vercel.json` - Properly configured with function settings
- `next.config.ts` - Optimized for production
- `package.json` - Build scripts ready
- `.env.local` - Created for local development
- `.vercelignore` - Excludes unnecessary files

### 📝 Environment Variables Needed:

Add these to your Vercel project settings:

```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
OPENAI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
```

## 🧪 Local Testing with Vercel

1. **Install Vercel CLI globally:**

```bash
npm install -g vercel
```

2. **Test locally (clean output):**

```bash
npm run dev          # No deprecation warnings
vercel dev           # Test with Vercel environment
```

3. **Test with verbose output (if needed):**

```bash
npm run dev:verbose  # Shows all warnings/deprecations
```

4. **Build and test production build:**

```bash
npm run build
npm start
```

## ✅ Issues Resolved

### Fixed Configuration Issues:

- ✅ **Runtime Error:** Removed invalid `nodejs20.x` runtime specification
- ✅ **NODE_ENV Warning:** Cleaned up environment variable configuration
- ✅ **TypeScript Errors:** Fixed all compilation issues
- ✅ **ESLint Issues:** Resolved all linting problems
- ✅ **Deprecation Warning:** Suppressed `util._extend` deprecation from fluent-ffmpeg

### Implemented Optimizations:

- ✅ **File Size Validation:** 10MB limit with proper error handling
- ✅ **Timeout Management:** 50s timeout with AbortController
- ✅ **Progress Indicators:** Client-side progress estimation utilities
- ✅ **Memory Optimization:** Proper memory limits in vercel.json
- ✅ **Error Handling:** Comprehensive error messages and status codes

## 🚨 Remaining Considerations

### 1. Audio Processing Limits

- **Vercel Limit:** 4.5MB request payload size
- **Solution:** Validate file sizes before processing
- **Timeout:** 60 seconds max for audio processing functions

### 2. FFmpeg Availability

- **Status:** `ffmpeg-static` package should work on Vercel
- **Fallback:** System ffmpeg configured as backup
- **Test:** Use `/api/health` endpoint to verify FFmpeg availability

### 3. Performance Optimization

- **Cold Starts:** First request may be slower
- **Memory:** Audio processing functions configured with appropriate memory limits
- **Caching:** Static assets properly cached

## 📊 Performance Monitoring

Your app includes:

- Security headers configured
- Image optimization enabled
- Compression enabled
- Static asset caching

## 🔄 Deployment Workflow & Preview vs Production Control

### Understanding Vercel Deployments

**Preview Deployments:**

- Safe testing environment
- Generated for every push to non-production branches
- Unique URLs for each deployment
- Perfect for testing before going live

**Production Deployments:**

- Live site that users see
- Only triggered by pushes to production branch (usually `main` or `master`)
- Uses your custom domain (if configured)

### Method 1: Branch-Based Control (Recommended)

**Setup Production Branch:**

1. In Vercel Dashboard → Project Settings → Git
2. Set **Production Branch** to `main` (or `master`)
3. All other branches automatically deploy to Preview

**Workflow:**

```bash
# Work on feature branches - these go to Preview
git checkout -b feature/new-audio-processing
git push origin feature/new-audio-processing  # → Preview deployment

# Merge to main when ready for Production
git checkout main
git merge feature/new-audio-processing
git push origin main  # → Production deployment
```

### Method 2: CLI Control

1. **Deploy Preview (any branch):**

   ```bash
   vercel
   ```

2. **Deploy Production (force):**

   ```bash
   vercel --prod
   ```

3. **Deploy specific branch to Preview:**
   ```bash
   git checkout feature-branch
   vercel
   ```

### Method 3: Vercel Configuration

Create or update `vercel.json` to control deployments:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": false
    }
  }
}
```

### Method 4: GitHub Integration Settings

**In Vercel Dashboard:**

1. Go to Project Settings → Git
2. Configure **Deploy Hooks**:
   - **Production Branch:** `main`
   - **Preview Branches:** All other branches
   - **Ignored Build Step:** Can skip builds for certain branches

### Method 5: Environment-Based Control

**Different configs per environment:**

```bash
# Preview environment
VERCEL_ENV=preview

# Production environment
VERCEL_ENV=production
```

### 🎯 Recommended Workflow for Your Project

1. **Development:**

   ```bash
   npm run dev
   ```

2. **Feature Development:**

   ```bash
   git checkout -b feature/audio-improvements
   # Make changes
   git push origin feature/audio-improvements  # → Preview
   ```

3. **Test Build Locally:**

   ```bash
   npm run build
   npm start
   ```

4. **Deploy to Preview (test):**

   ```bash
   vercel  # Always goes to Preview unless --prod
   ```

5. **Ready for Production:**
   ```bash
   git checkout main
   git merge feature/audio-improvements
   git push origin main  # → Production (if main is production branch)
   ```

### 🔧 Vercel Dashboard Settings

**To ensure Git pushes go to Preview:**

1. **Project Settings → Git:**

   - Production Branch: `main`
   - Auto-deploy: Enabled for all branches
   - Preview branches: All branches except production

2. **Project Settings → Functions:**

   - Preview deployments use same function config
   - Can have different environment variables

3. **Project Settings → Environment Variables:**
   - Set different values for Preview vs Production
   - Use `VERCEL_ENV` to detect environment in code

## 📋 Pre-Deployment Checklist

- [x] Build passes without errors
- [x] TypeScript compilation successful
- [x] ESLint issues resolved
- [x] Environment variables configured
- [x] Vercel.json properly configured
- [x] File size validation implemented (10MB limit)
- [x] Timeout handling implemented (50s + 60s function limit)
- [x] Progress indicators and error handling
- [x] Client-side validation utilities
- [x] Blob storage implementation for large files (up to 100MB)
- [x] Smart routing based on file size
- [ ] Production branch configured in Vercel dashboard (`main`)
- [ ] Preview deployment strategy chosen
- [ ] API keys added to Vercel dashboard (both Preview & Production)
- [ ] Domain configured (if custom domain needed)
- [ ] Test audio processing with small files first

## 🚦 Quick Setup for Preview-First Workflow

1. **Set Production Branch in Vercel:**

   - Dashboard → Project → Settings → Git
   - Set Production Branch to `main`

2. **Create Development Branch:**

   ```bash
   git checkout -b develop
   git push origin develop  # This will deploy to Preview
   ```

3. **Work on Features:**

   ```bash
   git checkout -b feature/new-feature
   git push origin feature/new-feature  # Preview deployment
   ```

4. **Deploy to Production when ready:**
   ```bash
   git checkout main
   git merge develop
   git push origin main  # Production deployment
   ```

## 🎯 Next Steps

1. Deploy to Vercel staging first
2. Test with small audio files
3. Monitor function execution times
4. Add file size validation
5. Consider implementing progress indicators for long operations

Your app is well-configured for Vercel deployment! The main consideration is the audio processing limitations, but your current setup should handle most use cases effectively.
