# 🚀 Simple Deployment Guide

## Quick Deploy to Vercel

### 1. Prerequisites
- [Vercel account](https://vercel.com) (free tier works)
- [Vercel CLI](https://vercel.com/cli) installed: `npm i -g vercel`

### 2. Deploy
```bash
# Login to Vercel
vercel login

# Deploy your app
npm run deploy
```

That's it! 🎉

## What Gets Deployed

- **Frontend**: Next.js app at your domain root (`/`)
- **API Functions**: Python functions at `/api/*`
  - `/api/extract-audio` - YouTube audio extraction
  - `/api/generate-text` - OpenAI text generation  
  - `/api/generate-speech` - ElevenLabs TTS
  - `/api/get-voices` - ElevenLabs voice retrieval
  - `/api/splice-audio` - Audio mixing and splicing

## Local Development

⚠️ **Important**: Python API functions only work when deployed to Vercel. For local development:

```bash
# Start frontend development server
npm run dev

# Visit http://localhost:3000
```

**To test API functions:**
1. Deploy to Vercel: `npm run deploy`
2. Test on your deployed URL
3. Or use `vercel dev` (requires Vercel CLI setup)

**Alternative for local testing:**
```bash
# Deploy to preview environment
vercel

# Test API functions on preview URL
npm run test:api https://your-preview-url.vercel.app
```

## Environment Variables

No environment variables needed! API keys are entered by users in the app interface.

## Troubleshooting

### YouTube Extraction Issues

**"Sign in to confirm you're not a bot" Error:**
- This is YouTube's anti-bot protection
- **Solution**: Try again in a few minutes - it's usually temporary
- **Alternative**: Use different YouTube videos
- **Why it happens**: YouTube blocks automated requests during high traffic

**Tips for Better Success:**
- Use popular, public videos (not private/unlisted)
- Avoid age-restricted content
- Try shorter videos (under 5 minutes work best)
- If one video fails, try another

### Deployment Issues
```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs <deployment-url>
```

### Function Errors
- Check Vercel dashboard for function logs
- Ensure Python dependencies are in `requirements.txt`
- Verify API function syntax

### Common Solutions
1. **Build fails**: Run `npm run build` locally to test
2. **Functions timeout**: Optimize code or upgrade Vercel plan
3. **Python errors**: Check function logs in Vercel dashboard
4. **YouTube blocks**: Wait a few minutes and try different videos

## Monitoring

- **Vercel Dashboard**: Monitor function performance and errors
- **Usage**: Track API calls and bandwidth
- **Logs**: View real-time function execution logs

## Custom Domain (Optional)

1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your custom domain

## Cost Estimation

**Vercel Hobby Plan (Free):**
- 100GB bandwidth/month
- 100GB-hours function execution
- 10-second function timeout

**Typical Usage:**
- Light usage (10 songs/month): Free
- Regular usage (50+ songs/month): Consider Pro plan

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Issues**: Check GitHub issues or create new one
- **Community**: Vercel Discord community