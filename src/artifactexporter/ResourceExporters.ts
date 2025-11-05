import { existsSync, mkdtempSync, copyFileSync, rmSync, createWriteStream, statSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path, { join, basename } from 'path';
import { pathToFileURL } from 'url';
import archiver from 'archiver';
import { dump } from 'js-yaml';
import { detectDocumentType } from '../document/DocumentUtils';
import { S3Service } from '../services/S3Service';
import { ArtifactExporter } from './ArtifactExporter';

export function isS3Url(url: string): boolean {
    return /^s3:\/\/[^/]+\/.+/.test(url);
}

export function isLocalFile(filePath: string): boolean {
    return existsSync(filePath) && statSync(filePath).isFile();
}

function isLocalFolder(path: string): boolean {
    return existsSync(path) && statSync(path).isDirectory();
}

function isArchiveFile(filePath: string) {
    // Quick extension check
    const ext = path.extname(filePath).toLowerCase();
    const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz', '.zst', '.war'];

    return archiveExts.includes(ext);
}

function copyToTempDir(filePath: string): string {
    const tmpDir = mkdtempSync(join(tmpdir(), 'cfn-'));
    const dst = join(tmpDir, basename(filePath));
    copyFileSync(filePath, dst);
    return tmpDir;
}

async function zipFolder(folderPath: string): Promise<string> {
    const filename = join(tmpdir(), `data-${Date.now()}.zip`);

    return await new Promise((resolve, reject) => {
        const output = createWriteStream(filename);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve(filename));
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(folderPath, false);
        void archive.finalize();
    });
}

function getS3Key(keyPrefix: string, filePath: string): string {
    const filename = basename(filePath);
    const timestamp = Date.now();
    const parts = filename.split('.');
    const prefix = keyPrefix ? `${keyPrefix}/artifact` : 'artifact';

    if (parts.length > 1) {
        const nameWithoutExt = parts.slice(0, -1).join('.');
        const extension = parts[parts.length - 1];
        return `${prefix}/${nameWithoutExt}-${timestamp}.${extension}`;
    } else {
        return `${prefix}/${filename}-${timestamp}`;
    }
}

export abstract class Resource {
    public abstract resourceType: string;
    public abstract propertyName: string;
    protected packageNullProperty = true;
    protected forceZip = false;

    constructor(protected s3Service: S3Service) {}

    async export(
        resourcePropertyDict: Record<string, unknown>,
        artifactAbsPath: string,
        bucketName: string,
        s3KeyPrefix: string,
    ): Promise<void> {
        if (!resourcePropertyDict) {
            return;
        }

        const propertyValue = resourcePropertyDict[this.propertyName];

        if (!propertyValue && !this.packageNullProperty) {
            return;
        }

        if (typeof propertyValue === 'object') {
            return;
        }

        let tempDir: string | undefined = undefined;
        if (isLocalFile(artifactAbsPath) && !isArchiveFile(artifactAbsPath) && this.forceZip) {
            tempDir = copyToTempDir(artifactAbsPath);
            resourcePropertyDict[this.propertyName] = tempDir;
        }

        try {
            const pathToUse = tempDir ?? artifactAbsPath;
            await this.doExport(resourcePropertyDict, pathToUse, bucketName, s3KeyPrefix);
        } finally {
            if (tempDir && existsSync(tempDir)) {
                rmSync(tempDir, { recursive: true });
            }
        }
    }

    async doExport(
        resourcePropertyDict: Record<string, unknown>,
        artifactAbsPath: string,
        bucketName: string,
        s3KeyPrefix: string,
    ): Promise<void> {
        if (!resourcePropertyDict) {
            return;
        }

        const localPath = resourcePropertyDict[this.propertyName];

        if (typeof localPath !== 'string' || isS3Url(localPath)) {
            return;
        }

        let uploadPath = artifactAbsPath;
        let tempZipFile: string | undefined = undefined;

        // If it's a directory, zip it first
        if (isLocalFolder(artifactAbsPath)) {
            tempZipFile = await zipFolder(artifactAbsPath);
            uploadPath = tempZipFile;
        }

        try {
            const key = getS3Key(s3KeyPrefix, uploadPath);
            const s3Url = `s3://${bucketName}/${key}`;

            await this.s3Service.putObject(uploadPath, s3Url);

            // eslint-disable-next-line require-atomic-updates
            resourcePropertyDict[this.propertyName] = s3Url;
        } finally {
            if (tempZipFile && existsSync(tempZipFile)) {
                rmSync(tempZipFile);
            }
        }
    }
}

export abstract class ResourceWithS3UrlDict extends Resource {
    protected abstract bucketNameProperty: string;
    protected abstract objectKeyProperty: string;
    protected versionProperty?: string;

    override async doExport(
        resourcePropertyDict: Record<string, unknown>,
        artifactAbsPath: string,
        bucketName: string,
        s3KeyPrefix: string,
    ): Promise<void> {
        if (!resourcePropertyDict) {
            return;
        }

        const localPath = resourcePropertyDict[this.propertyName];

        if (typeof localPath !== 'string' || isS3Url(localPath)) {
            return;
        }

        let uploadPath = artifactAbsPath;
        let tempZipFile: string | undefined = undefined;

        // If it's a directory, zip it first
        if (isLocalFolder(artifactAbsPath)) {
            tempZipFile = await zipFolder(artifactAbsPath);
            uploadPath = tempZipFile;
        }

        try {
            const key = getS3Key(s3KeyPrefix, uploadPath);
            const s3Url = `s3://${bucketName}/${key}`;

            const result = await this.s3Service.putObject(uploadPath, s3Url);

            const s3Record: Record<string, string> = {};
            s3Record[this.bucketNameProperty] = bucketName;
            s3Record[this.objectKeyProperty] = key;
            if (result.VersionId && this.versionProperty) {
                s3Record[this.versionProperty] = result.VersionId;
            }
            // eslint-disable-next-line require-atomic-updates
            resourcePropertyDict[this.propertyName] = s3Record;
        } finally {
            if (tempZipFile && existsSync(tempZipFile)) {
                rmSync(tempZipFile);
            }
        }
    }
}

export class ServerlessFunctionResource extends Resource {
    public override resourceType = 'AWS::Serverless::Function';
    public override propertyName = 'CodeUri';
    protected override forceZip = true;
}

export class ServerlessApiResource extends Resource {
    public override resourceType = 'AWS::Serverless::Api';
    public override propertyName = 'DefinitionUri';
    protected override packageNullProperty = false;
}

export class GraphQLSchemaResource extends Resource {
    public override resourceType = 'AWS::AppSync::GraphQLSchema';
    public override propertyName = 'DefinitionS3Location';
    protected override packageNullProperty = false;
}

export class LambdaFunctionResource extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::Lambda::Function';
    public override propertyName = 'Code';
    protected override bucketNameProperty = 'S3Bucket';
    protected override objectKeyProperty = 'S3Key';
    protected override versionProperty = 'S3ObjectVersion';
    protected override forceZip = true;
}

export class ApiGatewayRestApiResource extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::ApiGateway::RestApi';
    public override propertyName = 'BodyS3Location';
    protected override packageNullProperty = false;
    protected override bucketNameProperty = 'Bucket';
    protected override objectKeyProperty = 'Key';
    protected override versionProperty = 'Version';
}

export class CloudFormationStackResource extends Resource {
    public override resourceType = 'AWS::CloudFormation::Stack';
    public override propertyName = 'TemplateURL';

    override async doExport(
        resourcePropertyDict: Record<string, unknown>,
        templateAbsPath: string,
        bucketName: string,
        s3KeyPrefix: string,
    ): Promise<void> {
        if (!isLocalFile(templateAbsPath)) {
            throw new Error(`Invalid template path: ${templateAbsPath}`);
        }

        const templateUri = pathToFileURL(templateAbsPath).href;
        const content = readFileSync(templateAbsPath, 'utf8');
        const templateType = detectDocumentType(templateUri, content).type;

        const template = new ArtifactExporter(this.s3Service, templateType, templateUri, content);
        const exportedTemplateDict = await template.export(bucketName, s3KeyPrefix);
        const exportedTemplateStr = dump(exportedTemplateDict);

        const key = getS3Key(s3KeyPrefix, templateAbsPath);
        await this.s3Service.putObjectContent(exportedTemplateStr, bucketName, key);
        const s3Url = `s3://${bucketName}/${key}`;

        resourcePropertyDict[this.propertyName] = s3Url;
    }
}

class ServerlessApplicationResource extends CloudFormationStackResource {
    public override resourceType = 'AWS::Serverless::Application';
    public override propertyName = 'Location';
}

class AppSyncResolverRequestTemplateResource extends Resource {
    public override resourceType = 'AWS::AppSync::Resolver';
    public override propertyName = 'RequestMappingTemplateS3Location';
    protected override packageNullProperty = false;
}

class AppSyncResolverResponseTemplateResource extends Resource {
    public override resourceType = 'AWS::AppSync::Resolver';
    public override propertyName = 'ResponseMappingTemplateS3Location';
    protected override packageNullProperty = false;
}

class AppSyncFunctionConfigurationRequestTemplateResource extends Resource {
    public override resourceType = 'AWS::AppSync::FunctionConfiguration';
    public override propertyName = 'RequestMappingTemplateS3Location';
    protected override packageNullProperty = false;
}

class AppSyncFunctionConfigurationResponseTemplateResource extends Resource {
    public override resourceType = 'AWS::AppSync::FunctionConfiguration';
    public override propertyName = 'ResponseMappingTemplateS3Location';
    protected override packageNullProperty = false;
}

class ElasticBeanstalkApplicationVersion extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::ElasticBeanstalk::ApplicationVersion';
    public override propertyName = 'SourceBundle';
    protected override bucketNameProperty = 'S3Bucket';
    protected override objectKeyProperty = 'S3Key';
}

class ServerlessLayerVersionResource extends Resource {
    public override resourceType = 'AWS::Serverless::LayerVersion';
    public override propertyName = 'ContentUri';
    protected override forceZip = true;
}

class LambdaLayerVersionResource extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::Lambda::LayerVersion';
    public override propertyName = 'Content';
    protected override bucketNameProperty = 'S3Bucket';
    protected override objectKeyProperty = 'S3Key';
    protected override versionProperty = 'S3ObjectVersion';
    protected override forceZip = true;
}

class GlueJobCommandScriptLocationResource extends Resource {
    public resourceType = 'AWS::Glue::Job';
    public propertyName = 'Command.ScriptLocation';
}

class StepFunctionsStateMachineDefinitionResource extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::StepFunctions::StateMachine';
    public override propertyName = 'DefinitionS3Location';
    protected override bucketNameProperty = 'Bucket';
    protected override objectKeyProperty = 'Key';
    protected override versionProperty = 'Version';
    protected override packageNullProperty = false;
}

class ServerlessStateMachineDefinitionResource extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::Serverless::StateMachine';
    public override propertyName = 'DefinitionUri';
    protected override bucketNameProperty = 'Bucket';
    protected override objectKeyProperty = 'Key';
    protected override versionProperty = 'Version';
    protected override packageNullProperty = false;
}

class CodeCommitRepositoryS3Resource extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::CodeCommit::Repository';
    public override propertyName = 'Code.S3';
    protected override bucketNameProperty = 'Bucket';
    protected override objectKeyProperty = 'Key';
    protected override versionProperty = 'ObjectVersion';
    protected override packageNullProperty = false;
    protected override forceZip = true;
}

export const RESOURCES_EXPORT_LIST: Array<
    new (s3Service: S3Service, bucketName: string, s3KeyPrefix?: string) => Resource
> = [
    ServerlessFunctionResource,
    ServerlessApiResource,
    GraphQLSchemaResource,
    AppSyncResolverRequestTemplateResource,
    AppSyncResolverResponseTemplateResource,
    AppSyncFunctionConfigurationRequestTemplateResource,
    AppSyncFunctionConfigurationResponseTemplateResource,
    ApiGatewayRestApiResource,
    LambdaFunctionResource,
    ElasticBeanstalkApplicationVersion,
    CloudFormationStackResource,
    ServerlessApplicationResource,
    ServerlessLayerVersionResource,
    LambdaLayerVersionResource,
    GlueJobCommandScriptLocationResource,
    StepFunctionsStateMachineDefinitionResource,
    ServerlessStateMachineDefinitionResource,
    CodeCommitRepositoryS3Resource,
];

export const RESOURCE_EXPORTER_MAP = new Map([
    ['AWS::Serverless::Function', ServerlessFunctionResource],
    ['AWS::Serverless::Api', ServerlessApiResource],
    ['AWS::AppSync::GraphQLSchema', GraphQLSchemaResource],
    ['AWS::AppSync::Resolver', AppSyncResolverRequestTemplateResource],
    ['AWS::AppSync::FunctionConfiguration', AppSyncFunctionConfigurationRequestTemplateResource],
    ['AWS::ApiGateway::RestApi', ApiGatewayRestApiResource],
    ['AWS::Lambda::Function', LambdaFunctionResource],
    ['AWS::ElasticBeanstalk::ApplicationVersion', ElasticBeanstalkApplicationVersion],
    ['AWS::CloudFormation::Stack', CloudFormationStackResource],
    ['AWS::Serverless::Application', ServerlessApplicationResource],
    ['AWS::Serverless::LayerVersion', ServerlessLayerVersionResource],
    ['AWS::Lambda::LayerVersion', LambdaLayerVersionResource],
    ['AWS::Glue::Job', GlueJobCommandScriptLocationResource],
    ['AWS::StepFunctions::StateMachine', StepFunctionsStateMachineDefinitionResource],
    ['AWS::Serverless::StateMachine', ServerlessStateMachineDefinitionResource],
    ['AWS::CodeCommit::Repository', CodeCommitRepositoryS3Resource],
]);
