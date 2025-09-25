import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { DeepReadonly } from 'ts-essentials';
import { ServerComponents } from '../../server/ServerComponents';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { extractErrorMessage } from '../../utils/Errors';
import { parseWithPrettyError } from '../../utils/ZodErrorWrapper';
import { LLMConfigType, parseLLMConfig } from './LLMTypes';

export class LLMConfig {
    static readonly ConfigPath = join(homedir(), '.aws', 'cloudformation-ide');
    static readonly ConfigFile = join(LLMConfig.ConfigPath, 'llm-config.json');
    private readonly config?: LLMConfigType;

    constructor() {
        this.config = this.loadConfig();
    }

    private loadConfig() {
        if (!existsSync(LLMConfig.ConfigFile)) {
            return;
        }

        try {
            const config: unknown = JSON.parse(readFileSync(LLMConfig.ConfigFile, 'utf8'));
            const llmConfig = parseWithPrettyError(parseLLMConfig, config);
            logger.info({ provider: llmConfig.provider, model: llmConfig.model }, 'LLM configuration');
            return llmConfig;
        } catch (error) {
            logger.error(`Failed to parse LLM config. ${extractErrorMessage(error)}`);
        }
    }

    get(): undefined | DeepReadonly<LLMConfigType> {
        return this.config === undefined ? undefined : structuredClone(this.config);
    }

    static create(_components: ServerComponents) {
        return new LLMConfig();
    }
}

const logger = LoggerFactory.getLogger(LLMConfig);
