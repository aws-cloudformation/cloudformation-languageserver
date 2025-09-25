import { z } from 'zod';

const baseConfig = {
    model: z.string(),
    temperature: z.number().min(0).max(2).default(0.1),
    maxTokens: z.number().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().positive().optional(),
};

const openAIConfig = z.object({
    provider: z.literal('openai'),
    ...baseConfig,
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    apiKey: z.string().optional(),
    baseURL: z.string().optional(),
    organization: z.string().optional(),
});

const anthropicConfig = z.object({
    provider: z.literal('anthropic'),
    ...baseConfig,
    apiKey: z.string().optional(),
    anthropicApiUrl: z.string().optional(),
});

const bedrockConfig = z.object({
    provider: z.literal('bedrock'),
    ...baseConfig,
    region: z.string().optional(),
    credentials: z
        .object({
            accessKeyId: z.string(),
            secretAccessKey: z.string(),
            sessionToken: z.string().optional(),
        })
        .optional(),
});

const vertexAIConfig = z.object({
    provider: z.literal('google-vertexai'),
    ...baseConfig,
    projectId: z.string().optional(),
    location: z.string().optional(),
});

const genAIConfig = z.object({
    provider: z.literal('google-genai'),
    ...baseConfig,
    apiKey: z.string().optional(),
});

const ollamaConfig = z.object({
    provider: z.literal('ollama'),
    ...baseConfig,
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    baseUrl: z.string().optional(),
    numCtx: z.number().positive().optional(),
    numGpu: z.number().nonnegative().optional(),
    numThread: z.number().positive().optional(),
    repeatLastN: z.number().nonnegative().optional(),
    repeatPenalty: z.number().positive().optional(),
    tfsZ: z.number().positive().optional(),
    seed: z.number().optional(),
});

const cohereConfig = z.object({
    provider: z.literal('cohere'),
    ...baseConfig,
    apiKey: z.string().optional(),
});

const LLMConfigSchema = z.discriminatedUnion('provider', [
    openAIConfig,
    anthropicConfig,
    bedrockConfig,
    vertexAIConfig,
    genAIConfig,
    ollamaConfig,
    cohereConfig,
]);

export type LLMConfigType = z.infer<typeof LLMConfigSchema>;

export function parseLLMConfig(input: unknown): LLMConfigType {
    return LLMConfigSchema.parse(input);
}
