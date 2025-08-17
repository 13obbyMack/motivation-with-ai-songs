#!/usr/bin/env node

/**
 * Single App Deployment Script
 * Deploys Next.js frontend with Python API functions to a single Vercel app
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Deploying AI Motivation Song Generator (Single App)...\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json') || !fs.existsSync('api/extract-audio.py')) {
  console.error('❌ Please run this script from the project root directory');
  console.error('   Make sure both package.json and api/ directory exist');
  process.exit(1);
}

try {
  console.log('📦 Deploying to Vercel...');
  
  // Deploy the entire app (frontend + API functions)
  execSync('vercel --prod --yes', { stdio: 'inherit' });
  
  console.log('\n✅ Deployment completed successfully!');
  
  // Get the deployment URL
  console.log('🔍 Getting deployment URL...');
  const deploymentUrl = execSync('vercel --prod --yes', { encoding: 'utf8' }).trim();
  
  console.log(`🎉 Your app is live at: ${deploymentUrl}`);
  
  console.log('\n🧪 Testing deployment...');
  console.log(`   Frontend: ${deploymentUrl}`);
  console.log(`   API: ${deploymentUrl}/api/extract-audio`);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Visit your app and test the full workflow');
  console.log('2. Check Vercel dashboard for function logs');
  console.log('3. Monitor API usage and performance');
  console.log('4. Set up custom domain if needed');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.error('\n🔧 Troubleshooting:');
  console.error('1. Make sure you\'re logged into Vercel: vercel login');
  console.error('2. Check that all files are committed to git');
  console.error('3. Verify Python dependencies in requirements.txt');
  console.error('4. Check Vercel dashboard for detailed error logs');
  process.exit(1);
}