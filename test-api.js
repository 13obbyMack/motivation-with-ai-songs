#!/usr/bin/env node

/**
 * Simple API Test Script
 * Tests the API functions locally or in production
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:3000';

console.log('🧪 Testing API Functions');
console.log(`Base URL: ${BASE_URL}`);

if (BASE_URL.includes('localhost')) {
  console.log('⚠️  Note: Python API functions only work on Vercel, not localhost');
  console.log('   Deploy first: npm run deploy');
  console.log('   Then test: npm run test:api https://your-app.vercel.app');
}

console.log('=' .repeat(40));

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testExtractAudio() {
  console.log('🎵 Testing extract-audio...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/extract-audio`, {
      method: 'POST',
      body: {
        youtubeUrl: 'invalid-url'
      }
    });
    
    if (response.statusCode === 400 && response.data.error) {
      console.log('✅ Extract audio validation working');
      return true;
    } else {
      console.log(`❌ Unexpected response: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Extract audio error: ${error.message}`);
    return false;
  }
}

async function testGenerateText() {
  console.log('📝 Testing generate-text...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/generate-text`, {
      method: 'POST',
      body: {
        apiKey: 'invalid-key'
      }
    });
    
    if (response.statusCode === 401 && response.data.error) {
      console.log('✅ Generate text validation working');
      return true;
    } else {
      console.log(`❌ Unexpected response: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Generate text error: ${error.message}`);
    return false;
  }
}

async function testGetVoices() {
  console.log('🎤 Testing get-voices...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/get-voices`, {
      method: 'POST',
      body: {
        apiKey: 'invalid-key'
      }
    });
    
    if (response.statusCode === 401 && response.data.error) {
      console.log('✅ Get voices validation working');
      return true;
    } else {
      console.log(`❌ Unexpected response: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Get voices error: ${error.message}`);
    return false;
  }
}

async function testGenerateSpeech() {
  console.log('🗣️  Testing generate-speech...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/generate-speech`, {
      method: 'POST',
      body: {
        apiKey: 'invalid-key'
      }
    });
    
    if (response.statusCode === 400 && response.data.error) {
      console.log('✅ Generate speech validation working');
      return true;
    } else {
      console.log(`❌ Unexpected response: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Generate speech error: ${error.message}`);
    return false;
  }
}

async function testSpliceAudio() {
  console.log('🎵 Testing splice-audio...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/splice-audio`, {
      method: 'POST',
      body: {
        originalAudio: 'invalid-base64'
      }
    });
    
    if (response.statusCode === 400 && response.data.error) {
      console.log('✅ Splice audio validation working');
      return true;
    } else {
      console.log(`❌ Unexpected response: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Splice audio error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  const results = [];
  
  results.push(await testExtractAudio());
  results.push(await testGenerateText());
  results.push(await testGetVoices());
  results.push(await testGenerateSpeech());
  results.push(await testSpliceAudio());
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 Test Results');
  console.log('=' .repeat(20));
  console.log(`✅ Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    console.log('🎉 All API functions are working!');
    console.log('\n💡 Next steps:');
    console.log('1. Test with real API keys in the web interface');
    console.log('2. Try the full workflow end-to-end');
    console.log('3. Deploy to production when ready');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
}

runTests().catch(console.error);