import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      ffmpeg: {
        available: false,
        path: 'unknown'
      }
    };

    // Check if ffmpeg is available
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ffmpegStatic = require('ffmpeg-static');
      if (ffmpegStatic) {
        health.ffmpeg.available = true;
        health.ffmpeg.path = ffmpegStatic;
      }
    } catch {
      health.ffmpeg.available = false;
      health.ffmpeg.path = 'ffmpeg-static not available';
    }

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}