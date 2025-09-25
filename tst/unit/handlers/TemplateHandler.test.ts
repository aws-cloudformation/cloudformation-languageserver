import { StubbedInstance } from 'ts-sinon';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    CancellationToken,
    WorkDoneProgressReporter,
    ResultProgressReporter,
    ResponseError,
    ErrorCodes,
} from 'vscode-languageserver';
import { Context } from '../../../src/context/Context';
import * as SectionContextBuilder from '../../../src/context/SectionContextBuilder';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import {
    templateParametersHandler,
    templateValidationCreateHandler,
    templateDeploymentCreateHandler,
    templateValidationStatusHandler,
    templateDeploymentStatusHandler,
} from '../../../src/handlers/TemplateHandler';
import {
    GetParametersParams,
    GetParametersResult,
    TemplateStatus,
    WorkflowResult,
} from '../../../src/templates/TemplateRequestType';
import {
    createMockComponents,
    createMockSyntaxTreeManager,
    MockedServerComponents,
} from '../../utils/MockServerComponents';

vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

// Mock the parsers
vi.mock('../../../src/protocol/LspParser', () => ({
    parseIdentifiable: vi.fn((input) => input),
}));

vi.mock('../../../src/templates/TemplateParser', () => ({
    parseTemplateActionParams: vi.fn((input) => input),
    parseGetParametersParams: vi.fn((input) => input),
}));

vi.mock('../../../src/utils/ZodErrorWrapper', () => ({
    parseWithPrettyError: vi.fn((parser, input) => parser(input)),
}));

describe('TemplateHandler', () => {
    let mockComponents: MockedServerComponents;
    let syntaxTreeManager: StubbedInstance<SyntaxTreeManager>;
    let getEntityMapSpy: any;
    const mockToken = {} as CancellationToken;
    const mockWorkDoneProgress = {} as WorkDoneProgressReporter;
    const mockResultProgress = {} as ResultProgressReporter<GetParametersResult>;

    beforeEach(() => {
        syntaxTreeManager = createMockSyntaxTreeManager();
        mockComponents = createMockComponents({ syntaxTreeManager });
        getEntityMapSpy = vi.mocked(SectionContextBuilder.getEntityMap);
        mockComponents.validationWorkflowService.start.reset();
        mockComponents.validationWorkflowService.getStatus.reset();
        mockComponents.deploymentWorkflowService.start.reset();
        mockComponents.deploymentWorkflowService.getStatus.reset();
    });

    describe('templateParametersHandler', () => {
        it('returns empty array when no syntax tree found', () => {
            const params: GetParametersParams = { uri: 'test://template.yaml' };
            syntaxTreeManager.getSyntaxTree.withArgs(params.uri).returns(undefined);

            const handler = templateParametersHandler(mockComponents);
            const result = handler(params, mockToken, mockWorkDoneProgress, mockResultProgress) as GetParametersResult;

            expect(result).toEqual({ parameters: [] });
        });

        it('returns empty array when getEntityMap returns undefined', () => {
            const params: GetParametersParams = { uri: 'test://template.yaml' };
            const mockSyntaxTree = {} as SyntaxTree;

            syntaxTreeManager.getSyntaxTree.withArgs(params.uri).returns(mockSyntaxTree);
            getEntityMapSpy.mockReturnValue(undefined);

            const handler = templateParametersHandler(mockComponents);
            const result = handler(params, mockToken, mockWorkDoneProgress, mockResultProgress) as GetParametersResult;

            expect(result).toEqual({ parameters: [] });
        });

        it('returns parameters when parameters section exists', () => {
            const params: GetParametersParams = { uri: 'test://template.yaml' };
            const mockSyntaxTree = {} as SyntaxTree;
            const mockParam1 = { name: 'param1', type: 'String' };
            const mockParam2 = { name: 'param2', type: 'Number' };
            const mockContext1 = { entity: mockParam1 } as unknown as Context;
            const mockContext2 = { entity: mockParam2 } as unknown as Context;
            const parametersMap = new Map([
                ['param1', mockContext1],
                ['param2', mockContext2],
            ]);

            syntaxTreeManager.getSyntaxTree.withArgs(params.uri).returns(mockSyntaxTree);
            getEntityMapSpy.mockReturnValue(parametersMap);

            const handler = templateParametersHandler(mockComponents);
            const result = handler(params, mockToken, mockWorkDoneProgress, mockResultProgress) as GetParametersResult;

            expect(result.parameters).toHaveLength(2);
            expect(result.parameters[0]).toBe(mockParam1);
            expect(result.parameters[1]).toBe(mockParam2);
        });
    });

    describe('templateValidationCreateHandler', () => {
        it('should delegate to validation service', async () => {
            const mockResult = { id: 'test-id', changeSetName: 'cs-123', stackName: 'test-stack' };
            mockComponents.validationWorkflowService.start.resolves(mockResult);

            const handler = templateValidationCreateHandler(mockComponents);
            const params = { id: 'test-id', uri: 'file:///test.yaml', stackName: 'test-stack' };

            const result = await handler(params, {} as any, {} as any);

            expect(mockComponents.validationWorkflowService.start.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });

        it('should propagate ResponseError from service', async () => {
            const responseError = new ResponseError(ErrorCodes.InternalError, 'Service error');
            mockComponents.validationWorkflowService.start.rejects(responseError);

            const handler = templateValidationCreateHandler(mockComponents);
            const params = { id: 'test-id', uri: 'file:///test.yaml', stackName: 'test-stack' };

            await expect(handler(params, {} as any, {} as any)).rejects.toThrow(responseError);
        });

        it('should wrap other errors as InternalError', async () => {
            mockComponents.validationWorkflowService.start.rejects(new Error('Generic error'));

            const handler = templateValidationCreateHandler(mockComponents);
            const params = { id: 'test-id', uri: 'file:///test.yaml', stackName: 'test-stack' };

            await expect(handler(params, {} as any, {} as any)).rejects.toThrow(ResponseError);
        });
    });

    describe('templateDeploymentCreateHandler', () => {
        it('should delegate to deployment service', async () => {
            const mockResult = { id: 'test-id', changeSetName: 'cs-123', stackName: 'test-stack' };
            mockComponents.deploymentWorkflowService.start.resolves(mockResult);

            const handler = templateDeploymentCreateHandler(mockComponents);
            const params = { id: 'test-id', uri: 'file:///test.yaml', stackName: 'test-stack' };

            const result = await handler(params, {} as any, {} as any);

            expect(mockComponents.deploymentWorkflowService.start.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });
    });

    describe('templateValidationStatusHandler', () => {
        it('should delegate to validation service poll', async () => {
            const mockResult = {
                id: 'test-id',
                status: TemplateStatus.VALIDATION_COMPLETE,
                result: WorkflowResult.SUCCESSFUL,
            };
            mockComponents.validationWorkflowService.getStatus.resolves(mockResult);

            const handler = templateValidationStatusHandler(mockComponents);
            const params = { id: 'test-id' };

            const result = await handler(params, {} as any, {} as any);

            expect(mockComponents.validationWorkflowService.getStatus.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });
    });

    describe('templateDeploymentStatusHandler', () => {
        it('should delegate to deployment service poll', async () => {
            const mockResult = {
                id: 'test-id',
                status: TemplateStatus.DEPLOYMENT_COMPLETE,
                result: WorkflowResult.SUCCESSFUL,
            };
            mockComponents.deploymentWorkflowService.getStatus.resolves(mockResult);

            const handler = templateDeploymentStatusHandler(mockComponents);
            const params = { id: 'test-id' };

            const result = await handler(params, {} as any, {} as any);

            expect(mockComponents.deploymentWorkflowService.getStatus.calledWith(params)).toBe(true);
            expect(result).toEqual(mockResult);
        });
    });
});
