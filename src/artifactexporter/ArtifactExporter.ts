import { resolve, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { TopLevelSection } from '../context/ContextType';
import { normalizeIntrinsicFunctionAndCondition } from '../context/semantic/Intrinsics';
import { DocumentType } from '../document/Document';
import { parseDocumentContent } from '../document/DocumentUtils';
import { S3Service } from '../services/S3Service';
import { Artifact } from '../stacks/actions/StackActionRequestType';
import { Measure } from '../telemetry/TelemetryDecorator';
import { isS3Url, RESOURCE_EXPORTER_MAP } from './ResourceExporters';

export type ArtifactWithProperty = {
    resourceType: string;
    resourcePropertyDict: Record<string, unknown>;
    propertyName: string;
    localFilePath: string;
};

export class ArtifactExporter {
    private readonly templateDict: unknown;

    constructor(
        private readonly s3Service: S3Service,
        private readonly templateType: DocumentType,
        private readonly templateUri: string,
        templateContent: string,
    ) {
        this.templateDict = parseDocumentContent(templateUri, templateContent);
    }

    private getResourceMapWithArtifact(): Record<string, ArtifactWithProperty[]> {
        const artifactMap: Record<string, ArtifactWithProperty[]> = {};

        if (
            this.templateDict === undefined ||
            this.templateDict === null ||
            typeof this.templateDict !== 'object' ||
            !(TopLevelSection.Resources in this.templateDict)
        ) {
            return artifactMap;
        }

        const template = this.templateDict as Record<string, unknown>;
        const resources = template[TopLevelSection.Resources];

        if (!resources || typeof resources !== 'object') {
            return artifactMap;
        }

        const resourcesDict = resources as Record<string, unknown>;

        for (const resourceObj of Object.values(resourcesDict)) {
            if (!resourceObj || typeof resourceObj !== 'object') continue;

            const resource = resourceObj as Record<string, unknown>;
            const resourceType = resource.Type as string;

            // Get the exporter class from the map
            const ExporterClass = RESOURCE_EXPORTER_MAP.get(resourceType);
            if (!ExporterClass) continue;

            const properties = resource.Properties as Record<string, unknown> | undefined;
            if (properties) {
                const exporter = new ExporterClass(this.s3Service);
                const propertyName = exporter.propertyName;
                const localFilePath = properties[propertyName];

                if (typeof localFilePath === 'string') {
                    if (!artifactMap[resourceType]) {
                        artifactMap[resourceType] = [];
                    }
                    artifactMap[resourceType].push({
                        resourceType,
                        resourcePropertyDict: properties,
                        propertyName,
                        localFilePath,
                    });
                }
            }
        }

        return artifactMap;
    }

    @Measure({ name: 'getTemplateArtifacts' })
    getTemplateArtifacts(): Artifact[] {
        const artifactMap = this.getResourceMapWithArtifact();
        const result: Artifact[] = [];

        for (const [resourceType, artifacts] of Object.entries(artifactMap)) {
            for (const artifact of artifacts) {
                result.push({
                    resourceType,
                    filePath: artifact.localFilePath,
                });
            }
        }

        return result;
    }

    private convertIntrinsicFunctionKeys(obj: unknown): unknown {
        if (obj === null || obj === undefined || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.convertIntrinsicFunctionKeys(item));
        }

        const result: Record<string, unknown> = {};
        const objDict = obj as Record<string, unknown>;

        for (const [key, value] of Object.entries(objDict)) {
            const newKey = normalizeIntrinsicFunctionAndCondition(key);
            result[newKey] = this.convertIntrinsicFunctionKeys(value);
        }

        return result;
    }

    @Measure({ name: 'exportArtifact' })
    async export(bucketName: string, s3KeyPrefix: string = ''): Promise<unknown> {
        if (
            this.templateDict === undefined ||
            this.templateDict === null ||
            typeof this.templateDict !== 'object' ||
            !(TopLevelSection.Resources in this.templateDict)
        ) {
            return this.templateDict;
        }

        await this.exportResources(bucketName, s3KeyPrefix);
        return this.templateType === DocumentType.YAML
            ? this.convertIntrinsicFunctionKeys(this.templateDict)
            : this.templateDict;
    }

    private async exportResources(bucketName: string, s3KeyPrefix: string): Promise<void> {
        const artifactMap = this.getResourceMapWithArtifact();

        for (const [resourceType, artifacts] of Object.entries(artifactMap)) {
            const ExporterClass = RESOURCE_EXPORTER_MAP.get(resourceType);

            if (ExporterClass) {
                for (const artifact of artifacts) {
                    if (
                        isS3Url(artifact.localFilePath) ||
                        artifact.localFilePath.startsWith('http://') ||
                        artifact.localFilePath.startsWith('https://')
                    ) {
                        // if filepath is not local path, skip uploading
                        continue;
                    }

                    const exporter = new ExporterClass(this.s3Service);
                    const templateUri = this.templateUri;
                    const templatePath = templateUri.startsWith('file:') ? fileURLToPath(templateUri) : templateUri;
                    const templateDir = dirname(templatePath);
                    const artifactAbsPath = isAbsolute(artifact.localFilePath)
                        ? artifact.localFilePath
                        : resolve(templateDir, artifact.localFilePath);
                    await exporter.export(artifact.resourcePropertyDict, artifactAbsPath, bucketName, s3KeyPrefix);
                }
            }
        }
    }
}
