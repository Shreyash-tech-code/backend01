import 'dotenv/config';
import { disabledAIProvider } from './detection.service.js';
import { geminiProvider } from './gemini.provider.js';
import { openAIProvider } from './openai.provider.js';
import { openRouterProvider } from './openrouter.provider.js';
export const configuredLLMProvider = process.env.NODE_ENV === 'test'
    ? disabledAIProvider
    : process.env.LLM_PROVIDER?.trim().toLowerCase() === 'openai'
        ? openAIProvider
        : process.env.LLM_PROVIDER?.trim().toLowerCase() === 'openrouter'
            ? openRouterProvider
            : geminiProvider;
