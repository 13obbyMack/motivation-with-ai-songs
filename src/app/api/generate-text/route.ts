import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GenerateTextRequest, GenerateTextResponse } from "@/types";
import {
  validateOpenAIKey,
  getModelConfig,
  handleOpenAIError,
} from "@/utils/openai";

// Default character prompt if none provided
const DEFAULT_CHARACTER_PROMPT =
  "You are a motivational speaker who inspires people to push beyond their limits. Speak with passion, authenticity, and unwavering belief in human potential.";

// Removed - now using utility function from @/utils/openai

function chunkText(text: string): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";
  let currentWordCount = 0;
  const TARGET_WORDS = 150;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;

    if (
      currentWordCount + sentenceWords > TARGET_WORDS &&
      currentChunk.trim()
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence.trim();
      currentWordCount = sentenceWords;
    } else {
      currentChunk += (currentChunk ? ". " : "") + sentence.trim();
      currentWordCount += sentenceWords;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

function createUserPrompt(userData: GenerateTextRequest["userData"]): string {
  const { name, physicalActivity, songTitle, sponsor, customInstructions } =
    userData;

  let prompt = `Create a powerful, personalized motivational message for ${name} who is engaged in ${physicalActivity}.`;

  if (songTitle) {
    prompt += ` They are listening to "${songTitle}" during their activity.`;
  }

  if (sponsor) {
    prompt += ` Include a natural mention of ${sponsor} as a supporter of their journey.`;
  }

  if (customInstructions) {
    prompt += ` Additional instructions: ${customInstructions}`;
  }

  prompt += `

The message should:
- Be 2-3 minutes of spoken content (approximately 300-450 words)
- Be intensely personal and motivating
- Reference their specific activity (${physicalActivity})
- Push them to overcome mental barriers and physical limitations
- Include specific actionable advice they can apply immediately
- Build to an emotional crescendo that drives action
- Feel like you're speaking directly to them in the moment

Make it raw, authentic, and powerful. This person needs to hear exactly what will push them to their next level.`;

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateTextRequest = await request.json();
    const { apiKey, userData } = body;

    // Basic validation
    if (!apiKey || !userData) {
      return NextResponse.json<GenerateTextResponse>(
        {
          motivationalText: "",
          chunks: [],
          success: false,
          error: "Missing required fields: apiKey and userData are required",
        },
        { status: 400 }
      );
    }

    if (!validateOpenAIKey(apiKey)) {
      return NextResponse.json<GenerateTextResponse>(
        {
          motivationalText: "",
          chunks: [],
          success: false,
          error: 'Invalid OpenAI API key format. Key should start with "sk-"',
        },
        { status: 401 }
      );
    }

    const { name, characterPrompt, physicalActivity } = userData;
    if (!name || !characterPrompt || !physicalActivity) {
      return NextResponse.json<GenerateTextResponse>(
        {
          motivationalText: "",
          chunks: [],
          success: false,
          error:
            "Missing required user data: name, characterPrompt, and physicalActivity are required",
        },
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    // Use the user-provided character prompt
    const systemPrompt = characterPrompt.trim() || DEFAULT_CHARACTER_PROMPT;
    const userPrompt = createUserPrompt(userData);

    // Get optimal model configuration
    const config = getModelConfig("premium"); // Use premium for best quality

    // Generate motivational text
    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      presence_penalty: config.presencePenalty,
      frequency_penalty: config.frequencyPenalty,
    });

    const motivationalText = completion.choices[0]?.message?.content;
    if (!motivationalText) {
      throw new Error("No content generated from OpenAI API");
    }

    const chunks = chunkText(motivationalText.trim());

    return NextResponse.json<GenerateTextResponse>({
      motivationalText: motivationalText.trim(),
      chunks,
      success: true,
    });
  } catch (error: unknown) {
    console.error("Text generation error:", error);

    const { message, statusCode } = handleOpenAIError(error);

    return NextResponse.json<GenerateTextResponse>(
      {
        motivationalText: "",
        chunks: [],
        success: false,
        error: message,
      },
      { status: statusCode }
    );
  }
}
