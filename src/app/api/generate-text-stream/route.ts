import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { GenerateTextRequest } from '@/types';
import { validateOpenAIKey, getModelConfig, handleOpenAIError } from '@/utils/openai';

// Default character prompt if none provided
const DEFAULT_CHARACTER_PROMPT = 'You are a motivational speaker who inspires people to push beyond their limits. Speak with passion, authenticity, and unwavering belief in human potential.';

function createUserPrompt(userData: GenerateTextRequest['userData']): string {
  const { name, physicalActivity, songTitle, sponsor, customInstructions } = userData;
  
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
      return new Response('Missing required fields', { status: 400 });
    }

    if (!validateOpenAIKey(apiKey)) {
      return new Response('Invalid OpenAI API key format', { status: 401 });
    }

    const { name, characterPrompt, physicalActivity } = userData;
    if (!name || !characterPrompt || !physicalActivity) {
      return new Response('Missing required user data', { status: 400 });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey });

    // Use the user-provided character prompt
    const systemPrompt = characterPrompt.trim() || DEFAULT_CHARACTER_PROMPT;
    const userPrompt = createUserPrompt(userData);

    // Get optimal model configuration
    const config = getModelConfig('premium');

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      presence_penalty: config.presencePenalty,
      frequency_penalty: config.frequencyPenalty,
      stream: true
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              const data = JSON.stringify({ content, done: false });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          
          // Send completion signal
          const doneData = JSON.stringify({ content: '', done: true });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (error) {
          const { message } = handleOpenAIError(error);
          const errorData = JSON.stringify({ error: message, done: true });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    console.error('Streaming text generation error:', error);
    const { message } = handleOpenAIError(error);
    return new Response(message, { status: 500 });
  }
}