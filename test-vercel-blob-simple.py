#!/usr/bin/env python3
"""
Simple test script to verify vercel_blob package installation and usage
"""
import os

def test_vercel_blob():
    print("Testing vercel_blob package...")
    
    # Test import
    try:
        import vercel_blob
        print(f"✅ Successfully imported vercel_blob")
        print(f"Module: {vercel_blob}")
        print(f"Module file: {getattr(vercel_blob, '__file__', 'No __file__ attribute')}")
        
        # Check available functions
        available_functions = [attr for attr in dir(vercel_blob) if not attr.startswith('_')]
        print(f"Available functions: {available_functions}")
        
        # Check if put function exists
        if hasattr(vercel_blob, 'put'):
            print(f"✅ put function found: {vercel_blob.put}")
        else:
            print("❌ put function not found")
            
    except ImportError as e:
        print(f"❌ Failed to import vercel_blob: {e}")
        return False
    
    # Test environment variable
    token = os.getenv('BLOB_READ_WRITE_TOKEN')
    if token:
        print(f"✅ BLOB_READ_WRITE_TOKEN found: {token[:10]}...")
    else:
        print("❌ BLOB_READ_WRITE_TOKEN not found")
        return False
    
    # Test simple upload
    try:
        test_content = b"Hello, this is a test!"
        test_filename = "test-simple.txt"
        
        print(f"Attempting to upload: {test_filename}")
        
        # Try different approaches based on the documentation
        try:
            # Approach 1: With options dict
            result = vercel_blob.put(test_filename, test_content, {
                'addRandomSuffix': 'true',
                'contentType': 'text/plain'
            })
            print(f"✅ Upload successful with options dict")
        except Exception as e1:
            print(f"Options dict failed: {e1}")
            try:
                # Approach 2: Without options
                result = vercel_blob.put(test_filename, test_content)
                print(f"✅ Upload successful without options")
            except Exception as e2:
                print(f"Simple upload also failed: {e2}")
                return False
        
        print(f"Result type: {type(result)}")
        print(f"Result: {result}")
        
        # Try to extract URL
        if isinstance(result, dict):
            url = result.get('url') or result.get('downloadUrl')
        else:
            url = getattr(result, 'url', None) or getattr(result, 'downloadUrl', None)
        
        if url:
            print(f"✅ Got URL: {url}")
        else:
            print(f"❌ No URL found in result")
            
        return True
        
    except Exception as e:
        print(f"❌ Upload test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_vercel_blob()
    if success:
        print("\n🎉 vercel_blob package is working!")
    else:
        print("\n💥 vercel_blob package has issues")