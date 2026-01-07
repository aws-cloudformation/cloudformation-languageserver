import { ResourceSchema } from '../ResourceSchema';
import type { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

type EdgeCaseHandler = (resourceProperties: Record<string, unknown>) => void;

// WAFv2 IPSet Description pattern requires non-whitespace start/end chars
const removeEmptyOrWhitespaceDescription: EdgeCaseHandler = (resourceProperties) => {
    if (typeof resourceProperties.Description !== 'string') {
        return;
    }
    if (resourceProperties.Description.trim() === '') {
        delete resourceProperties.Description;
    }
};

/**
 * Transformer that handles specific edge cases not covered by schema-based transformers.
 * Add handlers here for resource-specific issues that cause deployment failures.
 */
export class ResourceEdgeCaseTransformer implements ResourceTemplateTransformer {
    private readonly handlers: ReadonlyMap<string, EdgeCaseHandler[]> = new Map([
        // WAFv2 IPSet: Description pattern requires non-whitespace start/end chars
        ['AWS::WAFv2::IPSet', [removeEmptyOrWhitespaceDescription]],
    ]);

    public transform(resourceProperties: Record<string, unknown>, schema: ResourceSchema): void {
        const handlers = this.handlers.get(schema.typeName);
        if (!handlers) {
            return;
        }

        for (const handler of handlers) {
            handler(resourceProperties);
        }
    }
}
