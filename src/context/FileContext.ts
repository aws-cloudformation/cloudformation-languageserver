import { DocumentType } from '../document/Document';
import { parseJson } from '../document/JsonParser';
import { parseYaml } from '../document/YamlParser';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TopLevelSection } from './ContextType';
import { Entity } from './semantic/Entity';
import { createEntityFromObject } from './semantic/EntityBuilder';
import { parseObject } from './syntaxtree/utils/NodeParse';

/**
 * File-based context for CloudFormation documents providing access to all sections and entities.
 */
export class FileContext {
    private readonly log = LoggerFactory.getLogger(FileContext);
    private readonly sectionDataCache = new Map<TopLevelSection, unknown>();
    private readonly entityCache = new Map<TopLevelSection, readonly Entity[]>();

    constructor(
        public readonly uri: string,
        public readonly documentType: DocumentType,
        private readonly fileContents: string,
    ) {}

    private getSectionData(section: TopLevelSection): unknown {
        if (this.sectionDataCache.has(section)) {
            return this.sectionDataCache.get(section);
        }

        this.parseAndCacheDocument();
        return this.sectionDataCache.get(section);
    }

    private parseAndCacheDocument(): void {
        if (this.sectionDataCache.size > 0) return;

        try {
            const parsedResult = this.parseDocumentContent();
            if (!parsedResult || typeof parsedResult !== 'object') {
                this.log.error({ uri: this.uri }, `Invalid ${this.documentType} structure: expected object`);
                return;
            }
            const parsed = parsedResult as Record<string, unknown>;

            this.cacheSectionsAndEntities(parsed);
        } catch (error) {
            this.log.error({ error, uri: this.uri }, `Failed to parse and cache ${this.documentType} document`);
        }
    }

    private parseDocumentContent(): unknown {
        if (this.documentType === DocumentType.JSON) {
            return parseJson(this.fileContents);
        }
        return parseYaml(this.fileContents, 0, false);
    }

    private cacheSectionsAndEntities(parsed: Record<string, unknown>): void {
        for (const section of Object.values(TopLevelSection)) {
            const sectionData = parsed[section];
            if (sectionData !== undefined) {
                this.sectionDataCache.set(section, sectionData);
                const entities = this.createEntitiesForSection(section, sectionData);
                this.entityCache.set(section, entities);
            }
        }
    }

    private getSectionEntities(section: TopLevelSection): readonly Entity[] {
        if (this.entityCache.has(section)) {
            const cachedEntities = this.entityCache.get(section);
            return cachedEntities ?? [];
        }

        const sectionData = this.getSectionData(section);
        const entities = this.createEntitiesForSection(section, sectionData);
        this.entityCache.set(section, entities);
        return entities;
    }

    private createEntitiesForSection(section: TopLevelSection, parsedData: unknown): readonly Entity[] {
        if (!parsedData) return [];

        try {
            if (section === TopLevelSection.Transform) {
                return [createEntityFromObject('Transform', parseObject(parsedData, this.documentType), section)];
            }

            if (typeof parsedData !== 'object') return [];

            return Object.entries(parsedData).map(([logicalId, data]) =>
                createEntityFromObject(logicalId, parseObject(data, this.documentType), section),
            );
        } catch (error) {
            this.log.error({ error, uri: this.uri, section }, 'Failed to create entities for section');
            return [];
        }
    }

    public getEntitiesFromSection(sectionName: TopLevelSection): readonly Entity[] {
        return this.getSectionEntities(sectionName);
    }

    public getEntitiesFromSections(...sectionNames: TopLevelSection[]): Map<TopLevelSection, readonly Entity[]> {
        return new Map(sectionNames.map((section) => [section, this.getEntitiesFromSection(section)]));
    }

    public hasSection(sectionName: TopLevelSection): boolean {
        return this.getSectionData(sectionName) !== undefined;
    }

    public getTopLevelSections(): ReadonlyMap<TopLevelSection, readonly Entity[]> {
        const sections = new Map<TopLevelSection, readonly Entity[]>();

        for (const section of Object.values(TopLevelSection)) {
            const sectionData = this.getSectionData(section);
            if (sectionData !== undefined) {
                const entities = this.getSectionEntities(section);
                sections.set(section, entities);
            }
        }

        return sections;
    }

    public getTopLevelSectionNames(): readonly TopLevelSection[] {
        return Object.values(TopLevelSection).filter((section) => this.hasSection(section));
    }

    /**
     * Retrieves an entity by its section and logical ID.
     *
     * @param section The top-level section containing the entity
     * @param logicalId The logical ID of the entity within the section (string for most sections, number for Transform)
     * @returns The entity at the specified location, or undefined if not found
     *
     * @example
     * // Get a resource entity
     * const bucketEntity = fileContext.getEntityBySection(TopLevelSection.Resources, "MyBucket");
     * // Get a transform entity by index
     * const transformEntity = fileContext.getEntityBySection(TopLevelSection.Transform, 0);
     */
    public getEntityBySection(section: TopLevelSection, logicalId: string | number): Entity | undefined {
        if (!this.hasSection(section)) {
            return undefined;
        }

        const entities = this.getEntitiesFromSection(section);

        if (section === TopLevelSection.Transform) {
            if (typeof logicalId !== 'number') {
                throw new TypeError('Invalid id for Transforms - must be a number');
            }

            if (logicalId < 0 || logicalId >= entities.length) {
                return undefined;
            }

            return entities[logicalId];
        }

        if (typeof logicalId !== 'string') {
            throw new TypeError(`Invalid logicalId for ${section} - must be a string`);
        }

        return entities.find((entity) => entity.name === logicalId);
    }
}
