import { Context } from '../context/Context';
import { getMetadataContextRelativePath, getMetadataContextScope } from '../context/MetadataContext';
import {
    getMetadataContextObjectSchema,
    METADATA_CONTEXT_DOCUMENTATION_URL,
    METADATA_CONTEXT_KEY,
    RESOURCE_METADATA_CONTEXT_SCHEMA,
    resolveMetadataContextSchema,
    TEMPLATE_METADATA_CONTEXT_SCHEMA,
} from '../schema/MetadataContextSchema';
import { PropertyType } from '../schema/ResourceSchema';
import { Measure } from '../telemetry/TelemetryDecorator';
import { HoverProvider } from './HoverProvider';

export class MetadataContextHoverProvider implements HoverProvider {
    static canProvide(context: Context): boolean {
        return getMetadataContextScope(context) !== undefined;
    }

    @Measure({ name: 'getInformation', extractContextAttributes: true })
    getInformation(context: Context): string | undefined {
        const scope = getMetadataContextScope(context);
        const relativePath = getMetadataContextRelativePath(context)?.filter((segment) => segment !== '');
        if (!scope || relativePath?.[0] !== METADATA_CONTEXT_KEY) {
            return undefined;
        }

        const rootSchema = scope === 'template' ? TEMPLATE_METADATA_CONTEXT_SCHEMA : RESOURCE_METADATA_CONTEXT_SCHEMA;
        if (relativePath.length === 1) {
            return this.formatRootDocumentation(rootSchema, scope);
        }

        const schemaPath = relativePath.slice(1);
        const fieldSchema = resolveMetadataContextSchema(rootSchema, schemaPath);
        if (!fieldSchema) {
            return undefined;
        }

        const fieldName = this.getFieldName(schemaPath);
        if (!fieldName) {
            return undefined;
        }

        return this.formatFieldDocumentation(fieldName, fieldSchema, this.isRequiredField(rootSchema, schemaPath));
    }

    private formatRootDocumentation(schema: PropertyType, scope: 'resource' | 'template'): string {
        const scopeDescription =
            scope === 'template'
                ? 'Use this template-level block for architecture and cross-cutting constraints.'
                : 'Use this resource-level block for rationale, invariants, change-safety guidance, provenance, and dependencies.';

        return [
            `### \`${METADATA_CONTEXT_KEY}\``,
            '',
            schema.description ?? '',
            '',
            scopeDescription,
            '',
            'The schema is advisory. CloudFormation does not validate or enforce Metadata Context.',
            '',
            `[Source Documentation](${METADATA_CONTEXT_DOCUMENTATION_URL})`,
        ].join('\n');
    }

    private formatFieldDocumentation(fieldName: string, schema: PropertyType, isRequired: boolean): string {
        const documentation = [
            `### \`${fieldName}\``,
            '',
            schema.description ?? '',
            '',
            `**Type:** ${this.formatType(schema)}`,
        ];

        if (isRequired) {
            documentation.push('', '**Required:** Yes');
        }
        if (schema.enum && schema.enum.length > 0) {
            documentation.push(
                '',
                `**Allowed values:** ${schema.enum.map((value) => `\`${String(value)}\``).join(', ')}`,
            );
        }

        documentation.push('', `[Source Documentation](${METADATA_CONTEXT_DOCUMENTATION_URL})`);
        return documentation.join('\n');
    }

    private formatType(schema: PropertyType): string {
        const types =
            schema.oneOf?.flatMap((variant) => this.getDeclaredTypes(variant)) ?? this.getDeclaredTypes(schema);
        return types.map((type) => `\`${type}\``).join(' or ');
    }

    private getDeclaredTypes(schema: PropertyType): string[] {
        if (Array.isArray(schema.type)) {
            return schema.type;
        }
        return schema.type ? [schema.type] : [];
    }

    private isRequiredField(rootSchema: PropertyType, schemaPath: ReadonlyArray<string | number>): boolean {
        const fieldName = schemaPath.at(-1);
        if (typeof fieldName !== 'string') {
            return false;
        }

        const parentSchema = resolveMetadataContextSchema(rootSchema, schemaPath.slice(0, -1));
        return getMetadataContextObjectSchema(parentSchema)?.required?.includes(fieldName) ?? false;
    }

    private getFieldName(schemaPath: ReadonlyArray<string | number>): string | undefined {
        const fieldName = schemaPath.findLast((segment) => typeof segment === 'string');
        return typeof fieldName === 'string' ? fieldName : undefined;
    }
}
