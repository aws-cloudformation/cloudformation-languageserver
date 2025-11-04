import {
    existsSync,
    mkdtempSync,
    copyFileSync,
    rmSync,
    createWriteStream,
    statSync,
    openSync,
    readSync,
    closeSync,
} from 'fs';
import { tmpdir } from 'os';
import path, { join, basename } from 'path';
import archiver from 'archiver';
import { dump } from 'js-yaml';
import { S3Service } from '../services/S3Service';
import { Template } from './ArtifactExporter';

export function isS3Url(url: string): boolean {
    return typeof url === 'string' && /^s3:\/\/[^/]+\/.+/.test(url);
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
    const archiveExts = ['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz'];

    if (!archiveExts.includes(ext)) return false;

    // Verify with magic numbers
    try {
        const fd = openSync(filePath, 'r');
        const buffer = Buffer.alloc(8);
        readSync(fd, buffer, 0, 8, 0);
        closeSync(fd);

        return (
            (buffer[0] === 0x50 && buffer[1] === 0x4b) || // ZIP
            buffer.toString('ascii', 0, 4) === 'Rar!' || // RAR
            (buffer[0] === 0x37 && buffer[1] === 0x7a) || // 7Z
            (buffer[0] === 0x1f && buffer[1] === 0x8b) // GZIP
        );
    } catch {
        return false;
    }
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
    const normalizedPrefix = keyPrefix ? keyPrefix.replace(/\/+$/, '') : '';
    const prefix = normalizedPrefix ? `${normalizedPrefix}/artifact` : 'artifact';

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
    protected bucketName: string;
    protected s3KeyPrefix: string;

    constructor(
        protected s3Service: S3Service,
        bucketName: string,
        s3KeyPrefix: string = '',
    ) {
        this.bucketName = bucketName;
        this.s3KeyPrefix = s3KeyPrefix;
    }

    async export(resourcePropertyDict: Record<string, unknown>, artifactAbsPath: string): Promise<void> {
        if (!resourcePropertyDict) {
            return;
        }

        const property = resourcePropertyDict;
        if (!property) {
            return;
        }

        const propertyValue = property[this.propertyName];

        if (!propertyValue && !this.packageNullProperty) {
            return;
        }

        if (typeof propertyValue === 'object' && propertyValue !== undefined) {
            return;
        }

        let tempDir: string | undefined = undefined;
        if (isLocalFile(artifactAbsPath) && !isArchiveFile(artifactAbsPath) && this.forceZip) {
            tempDir = copyToTempDir(artifactAbsPath);
            property[this.propertyName] = tempDir;
        }

        try {
            const pathToUse = tempDir ?? artifactAbsPath;
            await this.doExport(resourcePropertyDict, pathToUse);
        } finally {
            if (tempDir && existsSync(tempDir)) {
                rmSync(tempDir, { recursive: true });
            }
        }
    }

    async doExport(resourcePropertyDict: Record<string, unknown>, artifactAbsPath: string): Promise<void> {
        const property = resourcePropertyDict;
        if (!property) {
            return;
        }

        const localPath = property[this.propertyName];

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
            const key = getS3Key(this.s3KeyPrefix, uploadPath);
            const s3Url = `s3://${this.bucketName}/${key}`;

            await this.s3Service.putObject(uploadPath, s3Url);

            property[this.propertyName] = s3Url;
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

    override async doExport(resourcePropertyDict: Record<string, unknown>, artifactAbsPath: string): Promise<void> {
        const property = resourcePropertyDict;
        if (!property) {
            return;
        }

        const localPath = property[this.propertyName];

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
            const key = getS3Key(this.s3KeyPrefix, uploadPath);
            const s3Url = `s3://${this.bucketName}/${key}`;

            const result = await this.s3Service.putObject(uploadPath, s3Url);

            const s3Record: Record<string, string> = {};
            s3Record[this.bucketNameProperty] = this.bucketName;
            s3Record[this.objectKeyProperty] = key;
            if (result.VersionId && this.versionProperty) {
                s3Record[this.versionProperty] = result.VersionId;
            }
            property[this.propertyName] = s3Record;
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

    override async doExport(resourcePropertyDict: Record<string, unknown>, templateAbsPath: string): Promise<void> {
        if (!isLocalFile(templateAbsPath)) {
            throw new Error(`Invalid template path: ${templateAbsPath}`);
        }

        const template = new Template(this.s3Service, this.bucketName, this.s3KeyPrefix, undefined, templateAbsPath);
        const exportedTemplateDict = await template.export();
        const exportedTemplateStr = dump(exportedTemplateDict);

        const key = getS3Key(this.s3KeyPrefix, templateAbsPath);
        await this.s3Service.putObjectContent(exportedTemplateStr, this.bucketName, key);
        const s3Url = `s3://${this.bucketName}/${key}`;

        resourcePropertyDict[this.propertyName] = s3Url;
    }
}

export class ServerlessApplicationResource extends CloudFormationStackResource {
    public override resourceType = 'AWS::Serverless::Application';
    public override propertyName = 'Location';
}

export class AppSyncResolverRequestTemplateResource extends Resource {
    public override resourceType = 'AWS::AppSync::Resolver';
    public override propertyName = 'RequestMappingTemplateS3Location';
    protected override packageNullProperty = false;
}

export class AppSyncResolverResponseTemplateResource extends Resource {
    public override resourceType = 'AWS::AppSync::Resolver';
    public override propertyName = 'ResponseMappingTemplateS3Location';
    protected override packageNullProperty = false;
}

export class AppSyncFunctionConfigurationRequestTemplateResource extends Resource {
    public override resourceType = 'AWS::AppSync::FunctionConfiguration';
    public override propertyName = 'RequestMappingTemplateS3Location';
    protected override packageNullProperty = false;
}

export class AppSyncFunctionConfigurationResponseTemplateResource extends Resource {
    public override resourceType = 'AWS::AppSync::FunctionConfiguration';
    public override propertyName = 'ResponseMappingTemplateS3Location';
    protected override packageNullProperty = false;
}

export class ElasticBeanstalkApplicationVersion extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::ElasticBeanstalk::ApplicationVersion';
    public override propertyName = 'SourceBundle';
    protected override bucketNameProperty = 'S3Bucket';
    protected override objectKeyProperty = 'S3Key';
}

export class ServerlessLayerVersionResource extends Resource {
    public override resourceType = 'AWS::Serverless::LayerVersion';
    public override propertyName = 'ContentUri';
    protected override forceZip = true;
}

export class LambdaLayerVersionResource extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::Lambda::LayerVersion';
    public override propertyName = 'Content';
    protected override bucketNameProperty = 'S3Bucket';
    protected override objectKeyProperty = 'S3Key';
    protected override versionProperty = 'S3ObjectVersion';
    protected override forceZip = true;
}

export class GlueJobCommandScriptLocationResource extends Resource {
    public resourceType = 'AWS::Glue::Job';
    public propertyName = 'Command.ScriptLocation';
}

export class StepFunctionsStateMachineDefinitionResource extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::StepFunctions::StateMachine';
    public override propertyName = 'DefinitionS3Location';
    protected override bucketNameProperty = 'Bucket';
    protected override objectKeyProperty = 'Key';
    protected override versionProperty = 'Version';
    protected override packageNullProperty = false;
}

export class ServerlessStateMachineDefinitionResource extends ResourceWithS3UrlDict {
    public override resourceType = 'AWS::Serverless::StateMachine';
    public override propertyName = 'DefinitionUri';
    protected override bucketNameProperty = 'Bucket';
    protected override objectKeyProperty = 'Key';
    protected override versionProperty = 'Version';
    protected override packageNullProperty = false;
}

export class CodeCommitRepositoryS3Resource extends ResourceWithS3UrlDict {
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

export const RESOURCES_WITH_ARTIFACT = new Set([
    'AWS::Serverless::Function',
    'AWS::Serverless::Api',
    'AWS::AppSync::GraphQLSchema',
    'AWS::AppSync::Resolver',
    'AWS::AppSync::FunctionConfiguration',
    'AWS::ApiGateway::RestApi',
    'AWS::Lambda::Function',
    'AWS::ElasticBeanstalk::ApplicationVersion',
    'AWS::CloudFormation::Stack',
    'AWS::Serverless::Application',
    'AWS::Serverless::LayerVersion',
    'AWS::Lambda::LayerVersion',
    'AWS::Glue::Job',
    'AWS::StepFunctions::StateMachine',
    'AWS::Serverless::StateMachine',
    'AWS::CodeCommit::Repository',
]);

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
