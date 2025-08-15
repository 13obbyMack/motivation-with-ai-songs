const fetch = require('node-fetch');

async function testDeployedAPI() {
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll - short video for testing
  const apiUrl = 'https://motivation-with-ai-songs-40r3yjh4j-bobby-macks-projects.vercel.app/api/extract-audio';
  
  console.log('🧪 Testing deployed extract-audio API...');
  console.log('API URL:', apiUrl);
  console.log('Test YouTube URL:', testUrl);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        youtubeUrl: testUrl
      })
    });
    
    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ SUCCESS!');
      console.log('📹 Title:', data.title);
      console.log('⏱️  Duration:', data.duration, 'seconds');
      console.log('📦 Audio Data Size:', data.audioData ? `${(data.audioData.length * 0.75 / 1024 / 1024).toFixed(2)}MB` : 'No data');
    } else {
      console.log('❌ FAILED!');
      console.log('Error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testDeployedAPI();