import { Context } from '../context/Context';
import { Condition } from '../context/semantic/Entity';
import { toString } from '../utils/String';
import { HoverProvider } from './HoverProvider';

export class ConditionHoverProvider implements HoverProvider {
    getInformation(context: Context): string | undefined {
        const condition = context.entity as Condition;
        if (!condition) {
            return undefined;
        }
        const doc: Array<string> = [];
        doc.push(`**Condition:** ${condition.name}`, '\n', '---', `\`\`\`js\n${toString(condition.value)}\n\`\`\``);

        return doc.join('\n');
    }
}
