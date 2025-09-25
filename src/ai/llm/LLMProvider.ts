import { ChatAnthropic } from '@langchain/anthropic';
import { ChatBedrockConverse } from '@langchain/aws';
import { ChatCohere } from '@langchain/cohere';
import { BaseChatModel } from '@langchain/core/dist/language_models/chat_models';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { LLMConfigType } from './LLMTypes';

export function llmProvider(config: LLMConfigType): BaseChatModel {
    switch (config.provider) {
        case 'openai': {
            return new ChatOpenAI({
                model: config.model,
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                topP: config.topP,
                apiKey: config.apiKey,
                configuration: {
                    baseURL: config.baseURL,
                    organization: config.organization,
                },
                frequencyPenalty: config.frequencyPenalty,
                presencePenalty: config.presencePenalty,
            });
        }

        case 'anthropic': {
            return new ChatAnthropic({
                model: config.model,
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                topP: config.topP,
                topK: config.topK,
                apiKey: config.apiKey,
                anthropicApiUrl: config.anthropicApiUrl,
            });
        }

        case 'bedrock': {
            return new ChatBedrockConverse({
                model: config.model,
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                topP: config.topP,
                region: config.region,
                credentials: config.credentials,
            });
        }

        case 'google-vertexai': {
            return new ChatVertexAI({
                model: config.model,
                temperature: config.temperature,
                maxOutputTokens: config.maxTokens,
                topP: config.topP,
                topK: config.topK,
                location: config.location,
            });
        }

        case 'google-genai': {
            return new ChatGoogleGenerativeAI({
                model: config.model,
                temperature: config.temperature,
                maxOutputTokens: config.maxTokens,
                topP: config.topP,
                topK: config.topK,
                apiKey: config.apiKey,
            });
        }

        case 'ollama': {
            return new ChatOllama({
                model: config.model,
                temperature: config.temperature,
                topP: config.topP,
                topK: config.topK,
                baseUrl: config.baseUrl,
                frequencyPenalty: config.frequencyPenalty,
                presencePenalty: config.presencePenalty,
                numCtx: config.numCtx,
                numGpu: config.numGpu,
                numThread: config.numThread,
                repeatLastN: config.repeatLastN,
                repeatPenalty: config.repeatPenalty,
                tfsZ: config.tfsZ,
                seed: config.seed,
            });
        }

        case 'cohere': {
            return new ChatCohere({
                model: config.model,
                temperature: config.temperature,
                apiKey: config.apiKey,
            });
        }
    }
}
