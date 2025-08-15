import { NextRequest, NextResponse } from "next/server";
import youtubedl, { create } from "youtube-dl-exec";
import { ExtractAudioRequest, ExtractAudioResponse } from "@/types";
import path from "path";
import fs from "fs";

// YouTube URL validation regex
const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;

// Type definitions for youtube-dl-exec response
interface YoutubeDLFormat {
  format_id?: string;
  url?: string;
  ext?: string;
  acodec?: string;
  vcodec?: string;
  abr?: number;
}

interface YoutubeDLInfo {
  title?: string;
  duration?: number;
  url?: string;
  formats?: YoutubeDLFormat[];
}

// Function to get the youtube-dl-exec instance with correct binary path
function getYoutubeDlInstance() {
  console.log("Platform:", process.platform);
  console.log("Current working directory:", process.cwd());

  // Check if we're not on Windows with spaces in path (for local testing)
  const hasSpacesInPath = process.cwd().includes(' ');
  
  if (process.platform === 'win32' && hasSpacesInPath) {
    console.log("⚠️  Windows path contains spaces, trying system yt-dlp for local testing");
    try {
      // Try to use system yt-dlp on Windows
      return create('yt-dlp');
    } catch (error) {
      console.log("⚠️  System yt-dlp not available, using default instance");
      return youtubedl;
    }
  }

  // For production (Linux/Vercel), try different binary options
  const binaryOptions = [
    'yt-dlp-standalone', // Standalone binary that doesn't need Python
    'yt-dlp'            // Regular binary (needs Python)
  ];

  for (const binaryName of binaryOptions) {
    const binaryPath = path.resolve(
      process.cwd(),
      "src",
      "app",
      "api",
      "bin",
      binaryName
    );

    console.log("Checking for binary at:", binaryPath);
    
    if (fs.existsSync(binaryPath)) {
      console.log(`✅ Found ${binaryName} binary, creating custom instance`);
      return create(binaryPath);
    }
  }

  console.log("⚠️  No bundled binary found, using default instance");
  // Fallback to default instance
  return youtubedl;
}

// Function to get video info and audio URL using youtube-dl-exec
async function getVideoInfo(url: string) {
  try {
    // Get the youtube-dl instance with correct binary
    const ytdl = getYoutubeDlInstance();

    // First attempt with best audio format
    let info: YoutubeDLInfo;

    try {
      info = (await ytdl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        format: "bestaudio/best",
        addHeader: [
          "referer:youtube.com",
          "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ],
      })) as YoutubeDLInfo;
    } catch (binaryError) {
      console.warn(
        "Default binary failed, trying alternative approaches:",
        binaryError
      );

      // Try with different format options that might work better in serverless
      try {
        info = (await ytdl(url, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true,
          format: "worst",
          addHeader: [
            "referer:youtube.com",
            "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          ],
        })) as YoutubeDLInfo;
        console.log("Successfully used fallback format options");
      } catch (fallbackError) {
        console.error("All youtube-dl-exec attempts failed:", fallbackError);
        throw binaryError; // Throw original error
      }
    }

    // Find the best audio format
    let audioUrl = info.url;
    if (!audioUrl && info.formats) {
      const audioFormat = info.formats.find(
        (f: YoutubeDLFormat) => f.acodec && f.acodec !== "none" && f.url
      );
      audioUrl = audioFormat?.url;
    }

    return {
      title: info.title || "Unknown Title",
      duration: info.duration || 0,
      audioUrl: audioUrl || undefined,
    };
  } catch (error) {
    console.error("youtube-dl-exec failed:", error);
    throw error;
  }
}

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

    // Get video info using youtube-dl-exec
    let videoInfo;
    try {
      videoInfo = await getVideoInfo(trimmedUrl);
    } catch (error) {
      console.error("Error getting video info:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Provide more specific error messages
      if (
        errorMessage.includes("Sign in to confirm") ||
        errorMessage.includes("not available")
      ) {
        return NextResponse.json<ExtractAudioResponse>(
          {
            audioData: "",
            duration: 0,
            title: "",
            success: false,
            error:
              "YouTube is blocking access to this video. Please try again in a few minutes or use a different video.",
          },
          { status: 429 }
        );
      }

      // Check if it's a binary installation issue
      if (errorMessage.includes("ENOENT") || errorMessage.includes("spawn")) {
        return NextResponse.json<ExtractAudioResponse>(
          {
            audioData: "",
            duration: 0,
            title: "",
            success: false,
            error:
              "YouTube extraction service is temporarily unavailable. Please try again in a few minutes.",
          },
          { status: 503 }
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

    const { title, duration, audioUrl } = videoInfo;

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

    // Check if we have an audio URL
    if (!audioUrl) {
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

    // Download audio data
    try {
      console.log("Downloading audio from:", audioUrl);

      const response = await fetch(audioUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://www.youtube.com/",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch audio: ${response.status} ${response.statusText}`
        );
      }

      // Check content length to avoid downloading huge files
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        if (sizeInMB > 10) {
          throw new Error(
            `Audio file too large (${sizeInMB.toFixed(
              2
            )}MB). Please use shorter videos.`
          );
        }
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString("base64");

      console.log(
        `Successfully downloaded audio: ${(
          audioBuffer.byteLength /
          1024 /
          1024
        ).toFixed(2)}MB`
      );

      return NextResponse.json<ExtractAudioResponse>({
        audioData: audioBase64,
        duration: duration,
        title: title,
        success: true,
      });
    } catch (error) {
      console.error("Error downloading audio:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("too large")) {
        return NextResponse.json<ExtractAudioResponse>(
          {
            audioData: "",
            duration: 0,
            title: title,
            success: false,
            error: errorMessage,
          },
          { status: 413 }
        );
      }

      return NextResponse.json<ExtractAudioResponse>(
        {
          audioData: "",
          duration: 0,
          title: title,
          success: false,
          error: "Failed to download audio from YouTube video",
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
