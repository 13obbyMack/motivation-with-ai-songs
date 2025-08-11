import { NextRequest, NextResponse } from "next/server";
import { GetVoicesRequest, GetVoicesResponse, ElevenLabsVoice } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: GetVoicesRequest = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json<GetVoicesResponse>(
        {
          voices: [],
          success: false,
          error: "ElevenLabs API key is required",
        },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "xi-api-key": apiKey,
        "User-Agent": "NextJS-App/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let message = "Failed to retrieve voices from ElevenLabs";

      if (response.status === 401) {
        message = "Invalid ElevenLabs API key";
      } else if (response.status === 429) {
        message = "Rate limit exceeded. Please try again later";
      } else if (response.status === 402) {
        message = "Insufficient quota. Please check your ElevenLabs account";
      }

      return NextResponse.json<GetVoicesResponse>(
        {
          voices: [],
          success: false,
          error: message,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const voices: ElevenLabsVoice[] =
      data.voices?.map((voice: unknown) => {
        const voiceData = voice as Record<string, unknown>;
        return {
          voice_id: voiceData.voice_id as string,
          name: voiceData.name as string,
          category: (voiceData.category as string) || "uncategorized",
          description: voiceData.description as string,
          preview_url: voiceData.preview_url as string,
        };
      }) || [];

    return NextResponse.json<GetVoicesResponse>({
      voices,
      success: true,
    });
  } catch (error) {
    console.error("Error in get-voices API:", error);

    let errorMessage = "Internal server error while retrieving voices";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage =
          "Request timeout - ElevenLabs API took too long to respond";
        statusCode = 504;
      } else if (error.message.includes("fetch")) {
        errorMessage = "Network error connecting to ElevenLabs API";
        statusCode = 502;
      }
      console.error("Detailed error:", error.message, error.stack);
    }

    return NextResponse.json<GetVoicesResponse>(
      {
        voices: [],
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}
