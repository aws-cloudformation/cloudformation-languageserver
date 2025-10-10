import type { ResourceSchema } from '../ResourceSchema';
import type { ResourceTemplateTransformer } from './ResourceTemplateTransformer';

/**
 * Transformer that adds tabstop placeholders for required write-only properties.
 * Only adds placeholders at the required property level, not for nested write-only children.
 * Replaces empty objects with tabstop placeholders using LSP snippet syntax.
 * Uses sequential tabstops (${1}, ${2}, etc.). The $0 final cursor position is handled by the client.
 */
export class AddWriteOnlyRequiredPropertiesTransformer implements ResourceTemplateTransformer {
    public transform(resourceProperties: Record<string, unknown>, schema: ResourceSchema): void {
        const requiredProps = schema.required ?? [];
        const writeOnlyPaths = schema.writeOnlyProperties ?? [];

        if (requiredProps.length === 0 || writeOnlyPaths.length === 0) {
            return;
        }

        const requiredWriteOnlyProps = new Set<string>();

        for (const path of writeOnlyPaths) {
            const parts = this.parseJsonPointer(path);
            if (parts.length >= 2 && parts[0] === 'properties') {
                const rootProp = parts[1];
                if (requiredProps.includes(rootProp)) {
                    requiredWriteOnlyProps.add(rootProp);
                }
            }
        }

        let tabstopIndex = 1;
        for (const prop of requiredWriteOnlyProps) {
            if (!(prop in resourceProperties) || this.isEmpty(resourceProperties[prop])) {
                resourceProperties[prop] = `\${${tabstopIndex++}:update required write only property}`;
            }
        }
    }

    private isEmpty(value: unknown): boolean {
        if (value === null || value === undefined) {
            return true;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
            return Object.keys(value as Record<string, unknown>).length === 0;
        }
        return false;
    }

    private parseJsonPointer(pointer: string): string[] {
        if (!pointer.startsWith('/')) {
            return [];
        }
        return pointer
            .slice(1)
            .split('/')
            .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
    }
}
