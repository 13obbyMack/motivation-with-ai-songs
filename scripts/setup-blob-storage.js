#!/usr/bin/env node

/**
 * Setup script for enabling Vercel Blob storage
 * Run with: node scripts/setup-blob-storage.js
 */

const fs = require('fs');
const path = require('path');

const BLOB_STORAGE_FILE = path.join(__dirname, '..', 'src', 'utils', 'blob-storage.ts');

function enableBlobStorage() {
  console.log('🚀 Setting up Vercel Blob storage...\n');

  // Check if @vercel/blob is installed
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const hasBlobPackage = packageJson.dependencies?.['@vercel/blob'] || 
                        packageJson.devDependencies?.['@vercel/blob'];

  if (!hasBlobPackage) {
    console.log('❌ @vercel/blob package not found.');
    console.log('📦 Please install it first:');
    console.log('   npm install @vercel/blob\n');
    return false;
  }

  console.log('✅ @vercel/blob package found');

  // Read the blob storage file
  if (!fs.existsSync(BLOB_STORAGE_FILE)) {
    console.log('❌ Blob storage file not found:', BLOB_STORAGE_FILE);
    return false;
  }

  let content = fs.readFileSync(BLOB_STORAGE_FILE, 'utf8');

  // Check if already enabled
  if (!content.includes('// import { put, del } from \'@vercel/blob\';')) {
    console.log('✅ Blob storage appears to already be enabled');
    return true;
  }

  console.log('🔧 Enabling blob storage imports and functions...');

  // Enable imports
  content = content.replace(
    '// Uncomment when @vercel/blob is installed\n// import { put, del } from \'@vercel/blob\';',
    'import { put, del } from \'@vercel/blob\';'
  );

  // Enable uploadToBlob function
  content = content.replace(
    /\/\* Uncomment when @vercel\/blob is installed\s*\n([\s\S]*?)\*\//g,
    '$1'
  );

  // Enable the actual blob operations
  content = content.replace(
    '// Uncomment when @vercel/blob is installed',
    ''
  );

  // Remove temporary fallback comments
  content = content.replace(
    /\/\/ Temporary fallback[\s\S]*?return \{[\s\S]*?\};/g,
    ''
  );

  // Write the updated file
  fs.writeFileSync(BLOB_STORAGE_FILE, content);

  console.log('✅ Blob storage enabled successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Deploy to Vercel');
  console.log('2. Test with files larger than 4MB');
  console.log('3. Monitor blob storage usage in Vercel dashboard');
  console.log('\n🎯 Your app now supports files up to 100MB!');

  return true;
}

function checkBlobStorageStatus() {
  console.log('🔍 Checking blob storage status...\n');

  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const hasBlobPackage = packageJson.dependencies?.['@vercel/blob'] || 
                        packageJson.devDependencies?.['@vercel/blob'];

  console.log(`📦 @vercel/blob package: ${hasBlobPackage ? '✅ Installed' : '❌ Not installed'}`);

  if (fs.existsSync(BLOB_STORAGE_FILE)) {
    const content = fs.readFileSync(BLOB_STORAGE_FILE, 'utf8');
    const isEnabled = !content.includes('// import { put, del } from \'@vercel/blob\';');
    console.log(`🔧 Blob storage code: ${isEnabled ? '✅ Enabled' : '❌ Commented out'}`);
    
    if (hasBlobPackage && isEnabled) {
      console.log('\n🎉 Blob storage is fully configured and ready!');
    } else if (hasBlobPackage && !isEnabled) {
      console.log('\n⚠️  Package installed but code not enabled. Run with --enable to fix.');
    } else {
      console.log('\n📝 Install @vercel/blob package and run with --enable to set up.');
    }
  } else {
    console.log('❌ Blob storage file not found');
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--enable')) {
  enableBlobStorage();
} else if (args.includes('--status')) {
  checkBlobStorageStatus();
} else {
  console.log('🔧 Vercel Blob Storage Setup\n');
  console.log('Usage:');
  console.log('  node scripts/setup-blob-storage.js --status   # Check current status');
  console.log('  node scripts/setup-blob-storage.js --enable   # Enable blob storage');
  console.log('\nFirst install the package: npm install @vercel/blob');
}