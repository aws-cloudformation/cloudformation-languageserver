import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { llmProvider } from './llm/LLMProvider';
import { LLMConfigType } from './llm/LLMTypes';
import { logResponse, timeout } from './Utils';

export class Agent {
    private readonly timeout: number = 2 * 60 * 1000; // 2 minutes
    private readonly model: BaseChatModel;

    constructor(config: LLMConfigType) {
        this.model = llmProvider(config);
    }

    async execute(input: string, tools?: StructuredTool[]): Promise<BaseMessage | undefined> {
        const operation = async () => {
            const agent = createReactAgent({
                llm: this.model,
                tools: tools ?? [],
            });

            const result = await agent.invoke({
                messages: [new HumanMessage(input)],
            });

            const messages = result?.messages ?? [];
            logResponse(messages);
            return messages.at(-1);
        };

        return await timeout(operation(), this.timeout);
    }
}
