# AI Motivation Song Generator

Create personalized motivational audio content by combining your favorite music with AI-generated motivational speeches.

## 🏗️ Architecture

- **Frontend**: Next.js 15 with React 19 (TypeScript)
- **API**: Python serverless functions (yt-dlp, OpenAI, ElevenLabs, FFmpeg)
- **Storage**: Vercel Blob for large audio file handling
- **Deployment**: Single Vercel app with both frontend and API functions

## ✨ Features

- **🤖 AI-Powered Content**: Generate personalized motivational speeches using OpenAI GPT-4o/GPT-4o-mini
- **🎤 High-Quality Voice Synthesis**: Convert text to natural-sounding speech with ElevenLabs (multiple model options)
- **🎵 Advanced Audio Processing**: Professional audio mixing with FFmpeg integration
- **🎯 Smart Content Distribution**: Intelligently distribute motivational content throughout your music
- **🔧 Model Selection**: Choose between quality, speed, or balanced ElevenLabs models
- **🎛️ Advanced Audio Splicing**: Crossfade transitions, volume balancing, and intelligent placement
- **🍪 YouTube Cookie Support**: Handle age-restricted, region-locked, or private content with cookie authentication
- **� Privacy-First**: API keys stored locally, no personal data sent to servers
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Prerequisites

You'll need API keys from:

- **OpenAI** ([platform.openai.com](https://platform.openai.com)) - for text generation
- **ElevenLabs** ([elevenlabs.io](https://elevenlabs.io)) - for voice synthesis

### Using the Application

1. **Configure API Keys**

   - Enter your OpenAI and ElevenLabs API keys
   - Keys are stored securely in your browser session only

2. **Personalize Your Content**

   - Enter your name and create a custom character prompt
   - Choose your preferred ElevenLabs model (quality vs speed)
   - Select an ElevenLabs voice that matches your character
   - Specify your physical activity or goal
   - Add custom instructions (optional)

3. **Select Background Music**

   - Provide a YouTube URL for your preferred background music
   - Instrumental tracks work best for clear speech integration
   - For age-restricted or region-locked content, you can provide YouTube cookies

4. **Generate Your Song**
   - Advanced AI processing with chunk-based TTS generation
   - Professional audio mixing with crossfade transitions
   - Intelligent distribution of motivational content
   - Download your high-quality personalized motivational audio

## 💰 Cost Information

### Typical Usage Costs

- **OpenAI**: ~$0.01-0.05 per song (depending on complexity)
- **ElevenLabs**: 200-800 characters per song (free tier: 10,000 chars/month, up to 10k chars per request)

### Monthly Estimates

- **Light usage** (5-10 songs): $1-5
- **Regular usage** (20-30 songs): $5-15
- **Heavy usage** (50+ songs): $15-50

## 🛠️ For Developers

### Development Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd ai-motivation-song-generator
npm install

# Start development server (includes API functions)
npm run dev
```

**System Requirements:**

- Node.js 18+
- Python 3.9+ (for API functions)
- No additional setup needed - Vercel handles Python dependencies

### Available Scripts

```bash
npm run dev          # Start development server (frontend + API functions)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run deploy:preview # Deploy preview version to Vercel
```

### Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (frontend), Python (API functions)
- **Styling**: Tailwind CSS
- **API Functions**: Python serverless functions on Vercel
- **Audio Processing**: yt-dlp, FFmpeg, OpenAI GPT, ElevenLabs TTS
- **Storage**: Vercel Blob for large file handling
- **Deployment**: Vercel (single app)

### Project Structure

```
├── api/                # Python serverless functions
│   ├── extract-audio.py   # YouTube audio extraction
│   ├── generate-text.py   # OpenAI text generation
│   ├── generate-speech.py # ElevenLabs TTS
│   ├── get-voices.py      # ElevenLabs voice retrieval
│   └── splice-audio.py    # Advanced audio mixing and processing
├── src/                # Next.js frontend
│   ├── app/            # Next.js app router pages
│   ├── components/     # React components
│   ├── contexts/       # React contexts
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions (including API client)
├── requirements.txt    # Python dependencies for API functions
├── vercel.json        # Vercel configuration
└── package.json       # Frontend dependencies
```

## 🔒 Privacy & Security

- **API Keys**: Stored only in browser session storage, never on servers
- **Audio Files**: Processed temporarily and automatically deleted
- **YouTube Cookies**: Used only for the specific request, never stored or logged
- **Personal Data**: No personal information stored or transmitted to servers
- **HTTPS**: All communications encrypted in transit

## 🎯 Character Prompt Examples

Instead of predefined speakers, you can now create your own custom character prompts. Here are some examples:

- **Military Drill Sergeant** - "You are a tough military drill sergeant who pushes people to their limits with discipline and no-nonsense attitude"
- **Energetic Life Coach** - "You are an energetic life coach who uses positive psychology and uplifting language to inspire action"
- **Wise Mentor** - "You are a wise mentor who speaks with philosophical insights and gentle guidance to help people find their inner strength"
- **Sports Coach** - "You are an intense sports coach who motivates athletes with competitive spirit and tactical advice"
- **Spiritual Guide** - "You are a spiritual guide who combines mindfulness with practical motivation to help people overcome challenges"
- **Business Mentor** - "You are a successful entrepreneur who shares practical business wisdom and hustle mentality"
- **Fitness Trainer** - "You are a passionate fitness trainer who motivates people to push through physical and mental barriers"
- **Therapist** - "You are a supportive therapist who uses evidence-based techniques to help people build confidence and resilience"

### Voice Selection

After creating your character prompt, select an appropriate ElevenLabs voice that matches your character's personality and speaking style.

## 🎵 Music Recommendations

### Best Results

- ✅ Instrumental tracks (no vocals)
- ✅ 3-5 minute duration
- ✅ Moderate tempo
- ✅ High-quality uploads

### Avoid

- ❌ Songs with constant vocals
- ❌ Very short or very long tracks
- ❌ Poor audio quality
- ❌ Live recordings with crowd noise

## 🆘 Common Issues

### API Key Problems

- Verify keys are correct and accounts have sufficient credits
- Ensure billing information is set up for both services

### YouTube Issues

- Ensure videos are public and high-quality
- Try different videos if extraction fails

#### Age-Restricted or Region-Locked Content

If you encounter issues with restricted YouTube content, you can use YouTube cookies:

1. **Export cookies from your browser** using a browser extension like "Get cookies.txt LOCALLY"
2. **Paste the cookie data** into the YouTube Cookies field in the app
3. **Cookies are processed securely** and only used for that specific request
4. **No cookies are stored** - they're used once and discarded

**Supported restrictions:**

- Age-restricted content (18+ videos)
- Region-locked content (geo-blocked videos)
- Private/unlisted videos (if you have access)
- Premium content (if you're subscribed)

### Processing Failures

- Try shorter songs and stable internet connection
- Close other browser tabs to free memory

### Audio Quality

- Use instrumental tracks for best speech integration
- Ensure source video has good audio quality

## 📄 License

This project is for personal use only. Please respect all API terms of service and copyright laws when using external content.

---

**Ready to get motivated?** Start creating your personalized motivational songs today! 🎵💪
