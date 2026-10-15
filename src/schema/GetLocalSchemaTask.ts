import { readdir } from 'fs/promises';
import { join } from 'path';
import { DataStore } from '../datastore/DataStore';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Measure, Telemetry } from '../telemetry/TelemetryDecorator';
import { readFileIfExistsAsync } from '../utils/File';
import { GetSchemaTask } from './GetSchemaTask';
import { LocalSchemas, LocalSchemasType, LocalStoreKey } from './LocalSchemas';
import { CloudFormationResourceSchema } from './SamSchemaTransformer';

export class GetLocalSchemaTask extends GetSchemaTask {
    private readonly logger = LoggerFactory.getLogger(GetLocalSchemaTask);

    @Telemetry()
    private readonly telemetry!: ScopedTelemetry;

    constructor(
        private readonly getLocalSchemas: (
            dirs: readonly string[],
        ) => Promise<Map<string, CloudFormationResourceSchema>>,
        private readonly dirs: readonly string[],
        private readonly firstCreatedMs?: number,
    ) {
        super();
    }

    @Measure({ name: 'getSchemas', captureErrorAttributes: true })
    protected override async runImpl(dataStore: DataStore): Promise<void> {
        try {
            const resourceSchemas = await this.getLocalSchemas(this.dirs);

            // Convert to SamSchemasType format
            const schemas = [...resourceSchemas.entries()].map(([resourceType, schema]) => ({
                name: resourceType,
                content: JSON.stringify(schema),
                createdMs: Date.now(),
            }));

            const localSchemasData: LocalSchemasType = {
                version: LocalSchemas.V1,
                schemas: schemas,
                firstCreatedMs: this.firstCreatedMs ?? Date.now(),
                lastModifiedMs: Date.now(),
            };

            await dataStore.put(LocalStoreKey, localSchemasData);

            this.logger.info(`${resourceSchemas.size} local schemas loaded and saved`);
        } catch (error) {
            this.logger.error(error, 'Failed to load local schemas');
            throw error;
        }
    }
}

export async function getLocalSchemas(dirs: readonly string[]): Promise<Map<string, CloudFormationResourceSchema>> {
    const schemas = new Map<string, CloudFormationResourceSchema>();

    for (const dir of dirs) {
        let entries: string[];
        try {
            const allEntries = await readdir(dir, { recursive: true });
            entries = allEntries.filter((entry) => entry.endsWith('.json')).toSorted();
        } catch {
            continue;
        }

        const loaded = await Promise.all(entries.map((entry) => readLocalSchema(join(dir, entry))));
        for (const schema of loaded) {
            if (schema) {
                schemas.set(schema.typeName, schema);
            }
        }
    }

    return schemas;
}

async function readLocalSchema(path: string): Promise<CloudFormationResourceSchema | undefined> {
    const defaults = {
        required: [],
        attributes: {},
        readOnlyProperties: [],
        writeOnlyProperties: [],
        createOnlyProperties: [],
        primaryIdentifier: [],
    };

    try {
        const content = await readFileIfExistsAsync(path);
        const parsed: unknown = JSON.parse(content);
        return isResourceSchema(parsed) ? { ...defaults, ...parsed, additionalProperties: false } : undefined;
    } catch {
        return undefined;
    }
}

function isResourceSchema(value: unknown): value is CloudFormationResourceSchema {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const candidate = value as Record<string, unknown>;
    const hasTypeName = typeof candidate.typeName === 'string' && candidate.typeName.length > 0;
    const hasDescription = typeof candidate.description === 'string' && candidate.description.length > 0;
    const hasProperties = typeof candidate.properties === 'object' && candidate.properties !== null;

    return hasTypeName && hasDescription && hasProperties;
}
