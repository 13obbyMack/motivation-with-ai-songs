import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";
import { ExtractAudioRequest, ExtractAudioResponse } from "@/types";
import fs from 'fs';
import path from 'path';

// Monkey-patch fs.writeFileSync to redirect debug files to /tmp in production
if (process.env.NODE_ENV === 'production') {
  process.env.YTDL_NO_UPDATE = 'true';
  process.env.YTDL_DEBUG = 'false';
  
  const originalWriteFileSync = fs.writeFileSync;
  const originalWriteFile = fs.writeFile;
  
  // Override writeFileSync to redirect debug files to /tmp
  fs.writeFileSync = function(filePath: any, data: any, options?: any) {
    if (typeof filePath === 'string' && filePath.includes('watch.html')) {
      // Redirect debug files to /tmp directory
      const fileName = path.basename(filePath);
      const tmpPath = path.join('/tmp', fileName);
      return originalWriteFileSync.call(this, tmpPath, data, options);
    }
    return originalWriteFileSync.call(this, filePath, data, options);
  };
  
  // Override writeFile to redirect debug files to /tmp
  fs.writeFile = function(filePath: any, data: any, options?: any, callback?: unknown) {
    if (typeof filePath === 'string' && filePath.includes('watch.html')) {
      // Redirect debug files to /tmp directory
      const fileName = path.basename(filePath);
      const tmpPath = path.join('/tmp', fileName);
      return originalWriteFile.call(this, tmpPath, data, options, callback);
    }
    return originalWriteFile.call(this, filePath, data, options, callback);
  };
}

// YouTube URL validation regex
const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;

export async function POST(request: NextRequest) {
  try {
    const body: ExtractAudioRequest = await request.json();
    const { youtubeUrl } = body;

    // Validate YouTube URL
    if (!youtubeUrl || typeof youtubeUrl !== "string") {
      return NextResponse.json<ExtractAudioResponse>(
        {
          audioData: "",
          duration: 0,
          title: "",
          success: false,
          error: "YouTube URL is required",
        },
        { status: 400 }
      );
    }

    const trimmedUrl = youtubeUrl.trim();
    if (!YOUTUBE_URL_REGEX.test(trimmedUrl)) {
      return NextResponse.json<ExtractAudioResponse>(
        {
          audioData: "",
          duration: 0,
          title: "",
          success: false,
          error: "Please provide a valid YouTube URL",
        },
        { status: 400 }
      );
    }

    // Check if URL is valid and accessible
    let videoInfo;
    try {
      // Configure ytdl with options to avoid bot detection
      const ytdlOptions = {
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        }
      };

      const isValid = await ytdl.validateURL(trimmedUrl);
      if (!isValid) {
        return NextResponse.json<ExtractAudioResponse>(
          {
            audioData: "",
            duration: 0,
            title: "",
            success: false,
            error: "Invalid or inaccessible YouTube URL",
          },
          { status: 400 }
        );
      }

      // Retry logic for bot detection issues
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          videoInfo = await ytdl.getInfo(trimmedUrl, ytdlOptions);
          break; // Success, exit retry loop
        } catch (err) {
          lastError = err;
          retries--;
          
          if (retries > 0) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
          }
        }
      }
      
      if (!videoInfo) {
        throw lastError;
      }
    } catch (error) {
      console.error("Error validating YouTube URL:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide more specific error messages
      if (errorMessage.includes('Sign in to confirm')) {
        return NextResponse.json<ExtractAudioResponse>(
          {
            audioData: "",
            duration: 0,
            title: "",
            success: false,
            error: "YouTube is blocking access to this video. Please try again in a few minutes or use a different video.",
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json<ExtractAudioResponse>(
        {
          audioData: "",
          duration: 0,
          title: "",
          success: false,
          error:
            "Failed to access YouTube video. The video may be private, restricted, or unavailable.",
        },
        { status: 400 }
      );
    }

    // Extract video metadata
    const title = videoInfo.videoDetails.title;
    const duration = parseInt(videoInfo.videoDetails.lengthSeconds);

    // Check duration limits (max 10 minutes for reasonable processing)
    if (duration > 600) {
      return NextResponse.json<ExtractAudioResponse>(
        {
          audioData: "",
          duration: 0,
          title: title,
          success: false,
          error:
            "Video is too long. Please use videos shorter than 10 minutes.",
        },
        { status: 400 }
      );
    }

    // Get audio stream with highest quality
    const audioFormats = ytdl.filterFormats(videoInfo.formats, "audioonly");
    if (audioFormats.length === 0) {
      return NextResponse.json<ExtractAudioResponse>(
        {
          audioData: "",
          duration: 0,
          title: title,
          success: false,
          error: "No audio stream available for this video",
        },
        { status: 400 }
      );
    }

    // Select best audio format (prefer 192kbps or higher)
    const bestAudioFormat = audioFormats.reduce((best, current) => {
      const currentBitrate = current.audioBitrate || 0;
      const bestBitrate = best.audioBitrate || 0;
      return currentBitrate > bestBitrate ? current : best;
    });

    // Extract audio data
    try {
      const audioStream = ytdl(trimmedUrl, {
        format: bestAudioFormat,
        quality: "highestaudio",
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        }
      });

      // Collect audio data chunks
      const chunks: Buffer[] = [];

      return new Promise<NextResponse>((resolve) => {
        audioStream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
          
          // Check if we're approaching size limits during streaming
          const currentSize = chunks.reduce((total, chunk) => total + chunk.length, 0);
          const maxSize = 10 * 1024 * 1024; // 10MB limit
          
          if (currentSize > maxSize) {
            audioStream.destroy();
            resolve(
              NextResponse.json<ExtractAudioResponse>(
                {
                  audioData: "",
                  duration: 0,
                  title: title,
                  success: false,
                  error: `Audio file too large (${(currentSize / 1024 / 1024).toFixed(2)}MB). Please use shorter videos.`,
                },
                { status: 413 }
              )
            );
            return;
          }
        });

        audioStream.on("end", () => {
          try {
            // Combine all chunks into a single buffer
            const audioBuffer = Buffer.concat(chunks);

            // Convert to base64 for consistent API response format
            const audioBase64 = audioBuffer.toString("base64");

            const response: ExtractAudioResponse = {
              audioData: audioBase64,
              duration: duration,
              title: title,
              success: true,
            };

            resolve(NextResponse.json(response));
          } catch (error) {
            console.error("Error processing audio data:", error);
            resolve(
              NextResponse.json<ExtractAudioResponse>(
                {
                  audioData: "",
                  duration: 0,
                  title: title,
                  success: false,
                  error: "Failed to process audio data",
                },
                { status: 500 }
              )
            );
          }
        });

        audioStream.on("error", (error) => {
          console.error("Error extracting audio:", error);
          resolve(
            NextResponse.json<ExtractAudioResponse>(
              {
                audioData: "",
                duration: 0,
                title: title,
                success: false,
                error: "Failed to extract audio from YouTube video",
              },
              { status: 500 }
            )
          );
        });

        // Set timeout for long-running extractions
        setTimeout(() => {
          audioStream.destroy();
          resolve(
            NextResponse.json<ExtractAudioResponse>(
              {
                audioData: "",
                duration: 0,
                title: title,
                success: false,
                error: "Audio extraction timed out. Please try again.",
              },
              { status: 408 }
            )
          );
        }, 60000); // 60 second timeout
      });
    } catch (error) {
      console.error("Error creating audio stream:", error);
      return NextResponse.json<ExtractAudioResponse>(
        {
          audioData: "",
          duration: 0,
          title: title,
          success: false,
          error: "Failed to create audio stream",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in extract-audio API:", error);
    return NextResponse.json<ExtractAudioResponse>(
      {
        audioData: "",
        duration: 0,
        title: "",
        success: false,
        error: "An unexpected error occurred while processing your request",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to extract audio." },
    { status: 405 }
  );
}
