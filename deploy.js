#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Vercel deployment process...\n');

// Check if .env.local exists
if (!fs.existsSync('.env.local')) {
  console.log('⚠️  .env.local not found. Creating from .env.example...');
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env.local');
    console.log('✅ Created .env.local from .env.example');
    console.log('📝 Please add your API keys to .env.local before deploying\n');
  }
}

// Run build to check for errors
console.log('🔨 Building project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful!\n');
} catch (error) {
  console.error('❌ Build failed. Please fix errors before deploying.');
  process.exit(1);
}

// Check if vercel is installed
try {
  execSync('vercel --version', { stdio: 'pipe' });
} catch (error) {
  console.log('📦 Installing Vercel CLI...');
  execSync('npm install -g vercel', { stdio: 'inherit' });
}

console.log('🌐 Ready to deploy to Vercel!');
console.log('\nNext steps:');
console.log('1. Run: vercel (for preview deployment)');
console.log('2. Run: vercel --prod (for production deployment)');
console.log('3. Add your API keys in Vercel dashboard');
console.log('\n📖 See VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions');