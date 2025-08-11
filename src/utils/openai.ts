// OpenAI utility functions and configurations

export type OpenAIModel =
  | "gpt-4o" // Latest GPT-4o model (recommended)
  | "gpt-4o-mini"; // Faster, cheaper GPT-4o variant

export interface OpenAIConfig {
  model: OpenAIModel;
  maxTokens: number;
  temperature: number;
  presencePenalty: number;
  frequencyPenalty: number;
}

// Model configurations optimized for different use cases
export const MODEL_CONFIGS: Record<string, OpenAIConfig> = {
  // Best quality for motivational content
  premium: {
    model: "gpt-4o",
    maxTokens: 1000,
    temperature: 0.8,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
  },

  // Balanced performance and cost
  balanced: {
    model: "gpt-4o-mini",
    maxTokens: 1000,
    temperature: 0.8,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
  },

  // Most cost-effective
  economical: {
    model: "gpt-4o-mini",
    maxTokens: 800,
    temperature: 0.7,
    presencePenalty: 0.05,
    frequencyPenalty: 0.05,
  },
};

/**
 * Validates OpenAI API key format
 */
export function validateOpenAIKey(apiKey: string): boolean {
  return apiKey.startsWith("sk-") && apiKey.length > 20;
}

/**
 * Gets the optimal model configuration based on use case
 */
export function getModelConfig(
  useCase: "premium" | "balanced" | "economical" = "premium"
): OpenAIConfig {
  const config = MODEL_CONFIGS[useCase];
  if (!config) {
    throw new Error(`Invalid use case: ${useCase}`);
  }
  return config;
}

/**
 * Estimates token count for text (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Calculates estimated cost for OpenAI API call
 */
export function estimateCost(
  model: OpenAIModel,
  inputTokens: number,
  outputTokens: number
): number {
  // Pricing as of January 2025 (per 1M tokens)
  const pricing: Record<OpenAIModel, { input: number; output: number }> = {
    "gpt-4o": { input: 2.5, output: 10.0 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
  };

  const modelPricing = pricing[model];
  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

/**
 * Handles OpenAI API errors with user-friendly messages
 */
export function handleOpenAIError(error: unknown): {
  message: string;
  statusCode: number;
} {
  let message = "Failed to generate content";
  let statusCode = 500;

  // Type guard for error objects with status/code properties
  const hasStatus = (err: unknown): err is { status: number } => 
    typeof err === 'object' && err !== null && 'status' in err;
  
  const hasCode = (err: unknown): err is { code: string } => 
    typeof err === 'object' && err !== null && 'code' in err;

  if (hasStatus(error) && error.status === 401 || hasCode(error) && error.code === "invalid_api_key") {
    message = "Invalid or expired OpenAI API key";
    statusCode = 401;
  } else if (hasStatus(error) && error.status === 429) {
    message = "OpenAI API rate limit exceeded. Please try again later.";
    statusCode = 429;
  } else if (hasStatus(error) && error.status === 402 || hasCode(error) && error.code === "insufficient_quota") {
    message = "Insufficient OpenAI API quota. Please check your billing.";
    statusCode = 402;
  } else if (hasStatus(error) && error.status === 400) {
    message = "Invalid request to OpenAI API. Please check your input.";
    statusCode = 400;
  } else if (hasStatus(error) && error.status === 503) {
    message = "OpenAI API is temporarily unavailable. Please try again later.";
    statusCode = 503;
  } else if (hasCode(error) && error.code === "context_length_exceeded") {
    message =
      "Input text is too long. Please reduce the length of your custom instructions.";
    statusCode = 400;
  } else if (hasCode(error) && error.code === "model_not_found") {
    message = "The requested model is not available. Please try again.";
    statusCode = 400;
  }

  return { message, statusCode };
}
