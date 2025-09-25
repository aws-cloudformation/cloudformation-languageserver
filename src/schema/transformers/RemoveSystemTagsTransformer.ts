import type { ResourceSchema } from '../ResourceSchema';
import type { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

/**
 * Transformer that removes system tags (tags with "aws:" prefix) from CloudFormation resource properties.
 */
export class RemoveSystemTagsTransformer implements ResourceTemplateTransformer {
    private readonly DEFAULT_TAGS_PROPERTY = 'Tags';
    private readonly AWS_PREFIX = 'aws:';
    private readonly TAG_KEY = 'Key';

    public transform(resourceProperties: Record<string, unknown>, schema: ResourceSchema): void {
        this.removeSystemTags(resourceProperties, schema);
    }

    private removeSystemTags(resourceProperties: Record<string, unknown>, schema: ResourceSchema): void {
        // Check if resource has tagging configured
        if (!this.isTaggable(schema)) {
            return;
        }

        const tagPropertyPath = this.getTagPropertyPath();
        const tags = resourceProperties[tagPropertyPath];

        if (!tags) {
            return;
        }

        if (this.isTagsObject(tags)) {
            // Handle object format: { "key1": "value1", "key2": "value2" }
            const filteredTags: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(tags)) {
                if (!key.startsWith(this.AWS_PREFIX)) {
                    filteredTags[key] = value;
                }
            }
            resourceProperties[tagPropertyPath] = filteredTags;
        } else if (Array.isArray(tags)) {
            // Handle array format: [{ "Key": "key1", "Value": "value1" }, ...]
            resourceProperties[tagPropertyPath] = tags.filter((tag) => !this.isSystemTag(tag));
        }
    }

    private isTaggable(schema: ResourceSchema): boolean {
        // Check if resource has Tags property in its schema
        return schema.properties?.Tags !== undefined;
    }

    private getTagPropertyPath(): string {
        // In CloudFormation, tags are typically under "Tags" property
        return this.DEFAULT_TAGS_PROPERTY;
    }

    private isTagsObject(tags: unknown): tags is Record<string, unknown> {
        return typeof tags === 'object' && tags !== undefined && !Array.isArray(tags);
    }

    private isSystemTag(item: unknown): boolean {
        try {
            if (typeof item === 'object' && item !== undefined) {
                const tag = item as Record<string, unknown>;
                const key = tag[this.TAG_KEY];
                return typeof key === 'string' && key.startsWith(this.AWS_PREFIX);
            }
            return false;
        } catch {
            return false;
        }
    }
}
