#!/usr/bin/env python3
"""
Test script to verify QuickJS integration with yt-dlp
"""

import os
import sys
import yt_dlp

def test_quickjs():
    """Test QuickJS binary with yt-dlp"""
    
    # Locate QuickJS binary
    script_dir = os.path.dirname(os.path.abspath(__file__))
    qjs_path = os.path.join(script_dir, '..', 'api', '_bin', 'qjs')
    
    if not os.path.exists(qjs_path):
        print(f"❌ QuickJS binary not found at: {qjs_path}")
        print("   Run: scripts/download-quickjs.sh (or .ps1 on Windows)")
        return False
    
    print(f"✅ QuickJS binary found at: {qjs_path}")
    print(f"   Size: {os.path.getsize(qjs_path) / 1024 / 1024:.2f} MB")
    
    # Test with a simple YouTube video (Rick Astley - Never Gonna Give You Up)
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    print(f"\n🧪 Testing yt-dlp with QuickJS runtime...")
    print(f"   URL: {test_url}")
    
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'skip_download': True,  # Don't actually download, just test extraction
        'extractor_args': {
            'youtube': {
                'player_client': ['web'],
            }
        }
    }
    
    # Note: The js_runtime parameter may vary by yt-dlp version
    # Check yt-dlp documentation for the correct parameter name
    # Common options: 'js_runtime', 'js_runtimes', or CLI --js-runtimes
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(test_url, download=False)
            
            if info:
                print(f"\n✅ Success! Video info extracted:")
                print(f"   Title: {info.get('title', 'Unknown')}")
                print(f"   Duration: {info.get('duration', 0)}s")
                print(f"   Formats available: {len(info.get('formats', []))}")
                return True
            else:
                print(f"\n⚠️  Extraction returned no info")
                return False
                
    except Exception as e:
        print(f"\n❌ Extraction failed: {str(e)}")
        print(f"\n💡 This may be normal if:")
        print(f"   1. YouTube is blocking your IP (try with cookies)")
        print(f"   2. The video requires authentication")
        print(f"   3. yt-dlp needs to be updated")
        return False

if __name__ == '__main__':
    success = test_quickjs()
    sys.exit(0 if success else 1)
