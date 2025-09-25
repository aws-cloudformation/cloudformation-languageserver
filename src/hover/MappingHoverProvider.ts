import { Context } from '../context/Context';
import { Mapping } from '../context/semantic/Entity';
import { HoverProvider } from './HoverProvider';

export class MappingHoverProvider implements HoverProvider {
    getInformation(context: Context): string | undefined {
        const mapping = context.entity as Mapping;
        if (!mapping) {
            return undefined;
        }
        const doc: Array<string> = [];
        doc.push(`**Mapping:** ${mapping.name}`, '\n', '---');

        const topLevelKeys = mapping.getTopLevelKeys();
        if (topLevelKeys.length > 0) {
            for (const topLevelKey of topLevelKeys) {
                doc.push(`**${topLevelKey}:**`);

                const secondLevelKeys = mapping.getSecondLevelKeys(topLevelKey);
                for (const secondLevelKey of secondLevelKeys) {
                    const value = mapping.getValue(topLevelKey, secondLevelKey);
                    doc.push(`- ${secondLevelKey}: ${JSON.stringify(value)}`);
                }

                doc.push(''); // Add empty line between top-level keys
            }
        }

        return doc.join('\n');
    }
}
