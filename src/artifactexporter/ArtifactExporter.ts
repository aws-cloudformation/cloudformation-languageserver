import { readFileSync } from 'fs';
import { resolve, dirname, isAbsolute } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { load } from 'js-yaml';
import { TopLevelSection } from '../context/ContextType';
import { Document, DocumentType } from '../document/Document';
import { detectDocumentType } from '../document/DocumentUtils';
import { S3Service } from '../services/S3Service';
import { Artifact } from '../stacks/actions/StackActionRequestType';
import { isS3Url, RESOURCE_EXPORTER_MAP } from './ResourceExporters';

export type ArtifactWithProperty = {
    resourceType: string;
    resourcePropertyDict: Record<string, unknown>;
    propertyName: string;
    localFilePath: string;
};

export class Template {
    private readonly templateDict: unknown;
    private readonly templateUri: string;

    constructor(
        private readonly s3Service: S3Service,
        private readonly bucketName: string,
        private readonly s3KeyPrefix: string = '',
        private readonly document?: Document,
        private readonly templateAbsPath?: string,
    ) {
        if (this.document) {
            this.templateDict = this.document.getParsedDocumentContent();
            this.templateUri = this.document.uri;
        } else if (this.templateAbsPath) {
            const content = readFileSync(this.templateAbsPath, 'utf8');
            this.templateUri = pathToFileURL(this.templateAbsPath).href;
            const type = detectDocumentType(this.templateUri, content).type;
            if (type === DocumentType.YAML) {
                this.templateDict = load(content);
            } else {
                this.templateDict = JSON.parse(content);
            }
        } else {
            throw new Error('Either document or absolutePath must be provided');
        }
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
                const exporter = new ExporterClass(this.s3Service, this.bucketName, this.s3KeyPrefix);
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

    async export(): Promise<unknown> {
        if (
            this.templateDict === undefined ||
            this.templateDict === null ||
            typeof this.templateDict !== 'object' ||
            !(TopLevelSection.Resources in this.templateDict)
        ) {
            return this.templateDict;
        }

        await this.exportResources();
        return this.templateDict;
    }

    private async exportResources(): Promise<void> {
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

                    const exporter = new ExporterClass(this.s3Service, this.bucketName, this.s3KeyPrefix);
                    const templateUri = this.templateUri;
                    const templatePath = templateUri.startsWith('file:') ? fileURLToPath(templateUri) : templateUri;
                    const templateDir = dirname(templatePath);
                    const artifactAbsPath = isAbsolute(artifact.localFilePath)
                        ? artifact.localFilePath
                        : resolve(templateDir, artifact.localFilePath);
                    await exporter.export(artifact.resourcePropertyDict, artifactAbsPath);
                }
            }
        }
    }
}
