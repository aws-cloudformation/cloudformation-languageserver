import { readFileSync } from 'fs';
import { join } from 'path';
import { WaiterState } from '@smithy/util-waiter';
import { load } from 'js-yaml';
import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import {
    StackActionPhase,
    StackActionState,
    CreateValidationParams,
} from '../../../src/stacks/actions/StackActionRequestType';
import { ValidationManager } from '../../../src/stacks/actions/ValidationManager';
import { ValidationWorkflow } from '../../../src/stacks/actions/ValidationWorkflow';
import { createMockComponents } from '../../utils/MockServerComponents';

const TEMPLATE_PATH = join(__dirname, '../../resources/templates/simple.yaml');
const TEST_TEMPLATE_URI = `file://${TEMPLATE_PATH}`;
const ARTIFACT_TEMPLATE_PATH = join(__dirname, '../../resources/templates/template_with_file_artifact.yaml');
const TEST_ARTIFACT_TEMPLATE_URI = `file://${ARTIFACT_TEMPLATE_PATH}`;

describe('ValidationWorkflow', () => {
    let validationWorkflow: ValidationWorkflow;
    let validationManager: ValidationManager;
    let mockComponents: ReturnType<typeof createMockComponents>;

    beforeEach(() => {
        mockComponents = createMockComponents();
        validationManager = new ValidationManager();

        const templateContent = readFileSync(TEMPLATE_PATH, 'utf8');
        mockComponents.documentManager.get.withArgs(TEST_TEMPLATE_URI).returns({
            contents: () => templateContent,
            uri: TEST_TEMPLATE_URI,
            documentType: DocumentType.YAML,
        } as any);

        mockComponents.cfnService.describeStacks.rejects(new Error('Stack not found'));
        mockComponents.cfnService.createChangeSet.resolves({ Id: 'test-changeset', $metadata: {} });
        mockComponents.cfnService.waitUntilChangeSetCreateComplete.resolves({ state: WaiterState.SUCCESS });
        mockComponents.cfnService.describeChangeSet.resolves({
            Status: 'CREATE_COMPLETE',
            Changes: [{ ResourceChange: { Action: 'Add', LogicalResourceId: 'TestResource' } }],
            $metadata: {},
        });
        mockComponents.s3Service.putObjectContent.resolves({ ETag: '"test-etag"', $metadata: {} });
        mockComponents.s3Service.putObject.resolves({ VersionId: 'v1', $metadata: {} });
        mockComponents.s3Service.getHeadObject.resolves({ ETag: '"test-etag"', $metadata: {} });

        validationWorkflow = new ValidationWorkflow(
            mockComponents.cfnService,
            mockComponents.documentManager,
            mockComponents.diagnosticCoordinator,
            mockComponents.syntaxTreeManager,
            validationManager,
            mockComponents.s3Service,
        );
    });

    it('should complete validation workflow', async () => {
        mockComponents.cfnService.describeStacks.rejects(new Error('Stack not found'));
        mockComponents.cfnService.createChangeSet.resolves({ Id: 'test-changeset', $metadata: {} });
        mockComponents.cfnService.waitUntilChangeSetCreateComplete.resolves({ state: WaiterState.SUCCESS });
        mockComponents.cfnService.describeChangeSet.resolves({
            Status: 'CREATE_COMPLETE',
            Changes: [{ ResourceChange: { Action: 'Add', LogicalResourceId: 'TestResource' } }],
            $metadata: {},
        });
        mockComponents.s3Service.putObjectContent.resolves({ ETag: '"expected-etag"', $metadata: {} });
        mockComponents.s3Service.getHeadObject.resolves({ ETag: '"expected-etag"', $metadata: {} });

        const params: CreateValidationParams = {
            id: 'test-validation-1',
            uri: TEST_TEMPLATE_URI,
            stackName: 'test-stack',
            parameters: [],
            capabilities: [],
            keepChangeSet: false,
            s3Bucket: 'test-bucket',
            s3Key: 'template.yaml',
        };

        const result = await validationWorkflow.start(params);

        expect(result.id).toBe('test-validation-1');
        expect(result.stackName).toBe('test-stack');
        expect(result.changeSetName).toBeDefined();

        expect(mockComponents.cfnService.createChangeSet.called).toBe(true);

        await new Promise((resolve) => setTimeout(resolve, 25));

        const status = validationWorkflow.getStatus({ id: 'test-validation-1' });
        expect(status.phase).toBe(StackActionPhase.VALIDATION_COMPLETE);
        expect(status.state).toBe(StackActionState.SUCCESSFUL);
    });

    it('should handle S3 upload scenario', async () => {
        mockComponents.cfnService.describeStacks.rejects(new Error('Stack not found'));
        mockComponents.cfnService.createChangeSet.resolves({ Id: 'test-changeset', $metadata: {} });
        mockComponents.cfnService.waitUntilChangeSetCreateComplete.resolves({ state: WaiterState.SUCCESS });
        mockComponents.cfnService.describeChangeSet.resolves({
            Status: 'CREATE_COMPLETE',
            Changes: [{ ResourceChange: { Action: 'Add', LogicalResourceId: 'TestResource' } }],
            $metadata: {},
        });
        mockComponents.s3Service.putObjectContent.resolves({ ETag: '"test-etag"', $metadata: {} });
        mockComponents.s3Service.getHeadObject.resolves({ ETag: '"test-etag"', $metadata: {} });

        const params: CreateValidationParams = {
            id: 'test-validation-s3',
            uri: TEST_TEMPLATE_URI,
            stackName: 'test-stack',
            parameters: [],
            capabilities: [],
            keepChangeSet: false,
            s3Bucket: 'test-bucket',
            s3Key: 'template.yaml',
        };

        await validationWorkflow.start(params);

        await new Promise((resolve) => setTimeout(resolve, 25));

        expect(mockComponents.s3Service.putObjectContent.called).toBe(true);
        expect(mockComponents.s3Service.getHeadObject.called).toBe(true);
        expect(mockComponents.cfnService.createChangeSet.called).toBe(true);

        const status = validationWorkflow.getStatus({ id: 'test-validation-s3' });
        expect(status.phase).toBe(StackActionPhase.VALIDATION_COMPLETE);
        expect(status.state).toBe(StackActionState.SUCCESSFUL);
    });

    it('should handle artifact upload', async () => {
        const artifactTemplateContent = readFileSync(ARTIFACT_TEMPLATE_PATH, 'utf8');
        mockComponents.documentManager.get.withArgs(TEST_ARTIFACT_TEMPLATE_URI).returns({
            contents: () => artifactTemplateContent,
            uri: TEST_ARTIFACT_TEMPLATE_URI,
            documentType: DocumentType.YAML,
        } as any);

        mockComponents.cfnService.describeStacks.rejects(new Error('Stack not found'));
        mockComponents.cfnService.createChangeSet.resolves({ Id: 'test-changeset', $metadata: {} });
        mockComponents.cfnService.waitUntilChangeSetCreateComplete.resolves({ state: WaiterState.SUCCESS });
        mockComponents.cfnService.describeChangeSet.resolves({
            Status: 'CREATE_COMPLETE',
            Changes: [{ ResourceChange: { Action: 'Add', LogicalResourceId: 'TestResource' } }],
            $metadata: {},
        });
        mockComponents.s3Service.putObjectContent.resolves({ ETag: '"artifact-etag"', $metadata: {} });
        mockComponents.s3Service.putObject.resolves({ VersionId: 'v1', $metadata: {} });
        mockComponents.s3Service.getHeadObject.resolves({ ETag: '"artifact-etag"', $metadata: {} });

        const params: CreateValidationParams = {
            id: 'test-validation-artifacts',
            uri: TEST_ARTIFACT_TEMPLATE_URI,
            stackName: 'test-stack',
            parameters: [],
            capabilities: [],
            keepChangeSet: false,
            s3Bucket: 'test-bucket',
        };

        await validationWorkflow.start(params);
        await new Promise((resolve) => setTimeout(resolve, 25));

        expect(mockComponents.s3Service.putObject.called).toBe(true);
        expect(mockComponents.s3Service.putObjectContent.called).toBe(false);
        expect(mockComponents.s3Service.getHeadObject.called).toBe(false);
        expect(mockComponents.cfnService.createChangeSet.called).toBe(true);

        const createChangeSetArgs = mockComponents.cfnService.createChangeSet.getCall(0).args[0];
        const templateBody = load(createChangeSetArgs.TemplateBody!) as any;

        expect(templateBody.Resources.MyApi.Properties.DefinitionUri).toMatch(/^s3:\/\/test-bucket\//);

        const status = validationWorkflow.getStatus({ id: 'test-validation-artifacts' });
        expect(status.phase).toBe(StackActionPhase.VALIDATION_COMPLETE);
        expect(status.state).toBe(StackActionState.SUCCESSFUL);
    });

    it('should handle resource import', async () => {
        mockComponents.cfnService.describeStacks.rejects(new Error('Stack not found'));
        mockComponents.cfnService.createChangeSet.resolves({ Id: 'test-changeset', $metadata: {} });
        mockComponents.cfnService.waitUntilChangeSetCreateComplete.resolves({ state: WaiterState.SUCCESS });
        mockComponents.cfnService.describeChangeSet.resolves({
            Status: 'CREATE_COMPLETE',
            Changes: [{ ResourceChange: { Action: 'Import', LogicalResourceId: 'ImportedResource' } }],
            $metadata: {},
        });

        const params: CreateValidationParams = {
            id: 'test-validation-import',
            uri: TEST_TEMPLATE_URI,
            stackName: 'test-stack',
            parameters: [],
            capabilities: [],
            keepChangeSet: false,
            resourcesToImport: [
                {
                    LogicalResourceId: 'ImportedResource',
                    ResourceType: 'AWS::S3::Bucket',
                    ResourceIdentifier: { BucketName: 'existing-bucket' },
                },
            ],
        };

        await validationWorkflow.start(params);
        await new Promise((resolve) => setTimeout(resolve, 25));

        const createChangeSetArgs = mockComponents.cfnService.createChangeSet.getCall(0).args[0];
        expect(createChangeSetArgs.ChangeSetType).toBe('IMPORT');
        expect(createChangeSetArgs.ResourcesToImport).toBeDefined();
        expect(createChangeSetArgs.ResourcesToImport![0].LogicalResourceId).toBe('ImportedResource');
    });

    it('should handle validation failure', async () => {
        mockComponents.cfnService.describeStacks.resolves({
            Stacks: [
                {
                    StackName: 'test-stack',
                    CreationTime: new Date(),
                    StackStatus: 'CREATE_COMPLETE',
                },
            ],
            $metadata: {},
        });
        mockComponents.cfnService.createChangeSet.resolves({ Id: 'test-changeset', $metadata: {} });
        mockComponents.cfnService.waitUntilChangeSetCreateComplete.resolves({
            state: WaiterState.FAILURE,
            reason: 'Template validation failed',
        });
        mockComponents.cfnService.describeChangeSet.resolves({
            Status: 'FAILED',
            StatusReason: 'Template validation failed',
            $metadata: {},
        });

        const params: CreateValidationParams = {
            id: 'test-validation-2',
            uri: TEST_TEMPLATE_URI,
            stackName: 'test-stack',
            parameters: [],
            capabilities: [],
            keepChangeSet: false,
        };

        await validationWorkflow.start(params);

        expect(mockComponents.cfnService.createChangeSet.called).toBe(true);

        await new Promise((resolve) => setTimeout(resolve, 25));

        const status = validationWorkflow.describeStatus({ id: 'test-validation-2' });
        expect(status.phase).toBe(StackActionPhase.VALIDATION_FAILED);
        expect(status.state).toBe(StackActionState.FAILED);
        expect(status.FailureReason).toContain('Template validation failed');
    });

    it('should handle S3 etag mismatch', async () => {
        mockComponents.cfnService.describeStacks.rejects(new Error('Stack not found'));
        mockComponents.cfnService.createChangeSet.resolves({ Id: 'test-changeset', $metadata: {} });
        mockComponents.cfnService.waitUntilChangeSetCreateComplete.resolves({ state: WaiterState.SUCCESS });
        mockComponents.cfnService.describeChangeSet.resolves({
            Status: 'CREATE_COMPLETE',
            Changes: [{ ResourceChange: { Action: 'Add', LogicalResourceId: 'TestResource' } }],
            $metadata: {},
        });
        mockComponents.s3Service.putObjectContent.resolves({ ETag: '"expected-etag"', $metadata: {} });
        mockComponents.s3Service.getHeadObject.resolves({ ETag: '"wrong-etag"', $metadata: {} });

        const params: CreateValidationParams = {
            id: 'test-validation-3',
            uri: TEST_TEMPLATE_URI,
            stackName: 'test-stack',
            parameters: [],
            capabilities: [],
            keepChangeSet: false,
            s3Bucket: 'test-bucket',
            s3Key: 'template.yaml',
        };

        await expect(validationWorkflow.start(params)).rejects.toThrow('S3 object ETag mismatch');

        expect(mockComponents.s3Service.putObjectContent.called).toBe(true);
        expect(mockComponents.s3Service.getHeadObject.called).toBe(true);
        expect(mockComponents.cfnService.createChangeSet.called).toBe(false);
    });

    it('should handle API exception', async () => {
        mockComponents.cfnService.createChangeSet.rejects(new Error('Access denied'));

        const params: CreateValidationParams = {
            id: 'test-validation-4',
            uri: TEST_TEMPLATE_URI,
            stackName: 'test-stack',
            parameters: [],
            capabilities: [],
            keepChangeSet: false,
        };

        await expect(validationWorkflow.start(params)).rejects.toThrow('Access denied');
        expect(mockComponents.cfnService.createChangeSet.called).toBe(true);
    });
});
