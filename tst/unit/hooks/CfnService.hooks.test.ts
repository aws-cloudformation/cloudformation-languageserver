import {
    CloudFormationClient,
    CloudFormationServiceException,
    ListTypesCommand,
    DescribeTypeCommand,
    DeactivateTypeCommand,
    ActivateTypeCommand,
    BatchDescribeTypeConfigurationsCommand,
    DescribeChangeSetHooksCommand,
    GetHookResultCommand,
    ListHookResultsCommand,
    SetTypeConfigurationCommand,
    RegistryType,
    ThirdPartyType,
    Visibility,
} from '@aws-sdk/client-cloudformation';
import { mockClient } from 'aws-sdk-client-mock';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AwsClient } from '../../../src/services/AwsClient';
import { CfnService } from '../../../src/services/CfnService';

const cloudFormationMock = mockClient(CloudFormationClient);
const mockGetCloudFormationClient = vi.fn();

const mockClientComponent = {
    getCloudFormationClient: mockGetCloudFormationClient,
} as unknown as AwsClient;

describe('CfnService - Hooks', () => {
    let service: CfnService;

    beforeEach(() => {
        vi.clearAllMocks();
        cloudFormationMock.reset();
        mockGetCloudFormationClient.mockReturnValue(new CloudFormationClient({}));
        service = new CfnService(mockClientComponent);
    });

    describe('listHooks()', () => {
        it('should call ListTypesCommand with HOOK type and PRIVATE visibility', async () => {
            cloudFormationMock.on(ListTypesCommand).resolves({
                TypeSummaries: [
                    {
                        TypeName: 'Private::Guard::S3Check',
                        TypeArn: 'arn:aws:cloudformation:us-east-1:123:type/hook/Private-Guard-S3Check',
                    },
                ],
                NextToken: undefined,
            });

            const result = await service.listHooks();

            expect(result.hooks).toHaveLength(1);
            expect(result.hooks[0].TypeName).toBe('Private::Guard::S3Check');
            expect(result.nextToken).toBeUndefined();

            const call = cloudFormationMock.commandCalls(ListTypesCommand)[0];
            expect(call.args[0].input).toMatchObject({
                Type: RegistryType.HOOK,
                Visibility: Visibility.PRIVATE,
                MaxResults: 100,
            });
        });

        it('should pass nextToken for pagination', async () => {
            cloudFormationMock.on(ListTypesCommand).resolves({
                TypeSummaries: [],
                NextToken: 'next-page',
            });

            const result = await service.listHooks('token-123');

            expect(result.nextToken).toBe('next-page');
            const call = cloudFormationMock.commandCalls(ListTypesCommand)[0];
            expect(call.args[0].input.NextToken).toBe('token-123');
        });

        it('should return empty array when no hooks found', async () => {
            cloudFormationMock.on(ListTypesCommand).resolves({
                TypeSummaries: undefined,
            });

            const result = await service.listHooks();
            expect(result.hooks).toEqual([]);
        });

        it('should throw on API error', async () => {
            const error = new CloudFormationServiceException({
                message: 'Service error',
                $metadata: { httpStatusCode: 500 },
                name: 'CloudFormationServiceException',
                $fault: 'server',
            });
            cloudFormationMock.on(ListTypesCommand).rejects(error);

            await expect(service.listHooks()).rejects.toThrow(error);
        });
    });

    describe('describeHook()', () => {
        it('should call DescribeTypeCommand with typeName', async () => {
            cloudFormationMock.on(DescribeTypeCommand).resolves({
                TypeName: 'Private::Guard::S3Check',
                Arn: 'arn:aws:...',
                Description: 'Checks S3 encryption',
                Schema: '{}',
                Visibility: 'PRIVATE',
            });

            const result = await service.describeHook({ typeName: 'Private::Guard::S3Check' });

            expect(result.TypeName).toBe('Private::Guard::S3Check');
            const call = cloudFormationMock.commandCalls(DescribeTypeCommand)[0];
            expect(call.args[0].input).toMatchObject({
                Type: RegistryType.HOOK,
                TypeName: 'Private::Guard::S3Check',
            });
        });

        it('should call DescribeTypeCommand with arn', async () => {
            cloudFormationMock.on(DescribeTypeCommand).resolves({
                TypeName: 'Private::Guard::S3Check',
                Arn: 'arn:aws:cloudformation:us-east-1:123:type/hook/Private-Guard-S3Check',
            });

            const result = await service.describeHook({
                arn: 'arn:aws:cloudformation:us-east-1:123:type/hook/Private-Guard-S3Check',
            });

            expect(result.TypeName).toBe('Private::Guard::S3Check');
            const call = cloudFormationMock.commandCalls(DescribeTypeCommand)[0];
            expect(call.args[0].input).toMatchObject({
                Type: RegistryType.HOOK,
                Arn: 'arn:aws:cloudformation:us-east-1:123:type/hook/Private-Guard-S3Check',
            });
        });

        it('should throw on API error', async () => {
            const error = new CloudFormationServiceException({
                message: 'Type not found',
                $metadata: { httpStatusCode: 404 },
                name: 'TypeNotFoundException',
                $fault: 'client',
            });
            cloudFormationMock.on(DescribeTypeCommand).rejects(error);

            await expect(service.describeHook({ typeName: 'NonExistent' })).rejects.toThrow(error);
        });
    });

    describe('setHookConfiguration()', () => {
        it('should call SetTypeConfigurationCommand with correct params', async () => {
            cloudFormationMock.on(SetTypeConfigurationCommand).resolves({
                ConfigurationArn: 'arn:aws:cloudformation:us-east-1:123:type-configuration/hook/Private-Guard-S3Check',
            });

            const result = await service.setHookConfiguration({
                typeName: 'Private::Guard::S3Check',
                configuration: '{"CloudFormationConfiguration":{"HookConfiguration":{"FailureMode":"WARN"}}}',
            });

            expect(result.ConfigurationArn).toBeDefined();
            const call = cloudFormationMock.commandCalls(SetTypeConfigurationCommand)[0];
            expect(call.args[0].input).toMatchObject({
                Type: RegistryType.HOOK,
                TypeName: 'Private::Guard::S3Check',
                Configuration: '{"CloudFormationConfiguration":{"HookConfiguration":{"FailureMode":"WARN"}}}',
            });
        });
    });

    describe('deactivateHook()', () => {
        it('should call DeactivateTypeCommand with typeName', async () => {
            cloudFormationMock.on(DeactivateTypeCommand).resolves({});

            await service.deactivateHook({ typeName: 'Private::Guard::S3Check' });

            const call = cloudFormationMock.commandCalls(DeactivateTypeCommand)[0];
            expect(call.args[0].input).toMatchObject({
                Type: ThirdPartyType.HOOK,
                TypeName: 'Private::Guard::S3Check',
            });
        });

        it('should call DeactivateTypeCommand with arn', async () => {
            cloudFormationMock.on(DeactivateTypeCommand).resolves({});

            await service.deactivateHook({ arn: 'arn:aws:...' });

            const call = cloudFormationMock.commandCalls(DeactivateTypeCommand)[0];
            expect(call.args[0].input).toMatchObject({
                Arn: 'arn:aws:...',
            });
        });
    });

    describe('listPublicHooks()', () => {
        it('should list public hooks with a type name prefix filter', async () => {
            cloudFormationMock.on(ListTypesCommand).resolves({
                TypeSummaries: [{ TypeName: 'AWS::Sample::Hook' }],
            });

            const result = await service.listPublicHooks({ typeNamePrefix: 'AWS::Sample' });

            expect(result.hooks).toHaveLength(1);
            const call = cloudFormationMock.commandCalls(ListTypesCommand)[0];
            expect(call.args[0].input).toMatchObject({
                Type: RegistryType.HOOK,
                Visibility: Visibility.PUBLIC,
                Filters: { TypeNamePrefix: 'AWS::Sample' },
            });
        });

        it('should return empty hooks when none exist', async () => {
            cloudFormationMock.on(ListTypesCommand).resolves({});

            const result = await service.listPublicHooks();

            expect(result.hooks).toEqual([]);
        });
    });

    describe('activateHook()', () => {
        it('should call ActivateTypeCommand with hook type and role', async () => {
            cloudFormationMock.on(ActivateTypeCommand).resolves({ Arn: 'arn:aws:cloudformation:...' });

            await service.activateHook({
                typeName: 'AWS::Sample::Hook',
                publisherId: 'pub-1',
                executionRoleArn: 'arn:aws:iam::123:role/HookRole',
            });

            const call = cloudFormationMock.commandCalls(ActivateTypeCommand)[0];
            expect(call.args[0].input).toMatchObject({
                Type: ThirdPartyType.HOOK,
                TypeName: 'AWS::Sample::Hook',
                PublisherId: 'pub-1',
                ExecutionRoleArn: 'arn:aws:iam::123:role/HookRole',
            });
        });
    });

    describe('getHookConfiguration()', () => {
        it('should return the configuration for the hook', async () => {
            cloudFormationMock.on(BatchDescribeTypeConfigurationsCommand).resolves({
                TypeConfigurations: [{ Configuration: '{"CloudFormationConfiguration":{}}' }],
            });

            const result = await service.getHookConfiguration('Private::Guard::S3Check');

            expect(result).toBe('{"CloudFormationConfiguration":{}}');
        });

        it('should return empty object string when no configuration exists', async () => {
            cloudFormationMock.on(BatchDescribeTypeConfigurationsCommand).resolves({ TypeConfigurations: [] });

            const result = await service.getHookConfiguration('Private::Guard::S3Check');

            expect(result).toBe('{}');
        });
    });

    describe('listHookResults()', () => {
        it('should call ListHookResultsCommand with target filters', async () => {
            cloudFormationMock.on(ListHookResultsCommand).resolves({ HookResults: [] });

            await service.listHookResults({ targetId: 'chs-1', targetType: 'CHANGE_SET' });

            const call = cloudFormationMock.commandCalls(ListHookResultsCommand)[0];
            expect(call.args[0].input).toMatchObject({
                TargetId: 'chs-1',
                TargetType: 'CHANGE_SET',
            });
        });
    });

    describe('getHookResult()', () => {
        it('should call GetHookResultCommand with the result id', async () => {
            cloudFormationMock.on(GetHookResultCommand).resolves({ Status: 'HOOK_COMPLETE_SUCCEEDED' });

            const result = await service.getHookResult('hr-123');

            expect(result.Status).toBe('HOOK_COMPLETE_SUCCEEDED');
            const call = cloudFormationMock.commandCalls(GetHookResultCommand)[0];
            expect(call.args[0].input).toMatchObject({ HookResultId: 'hr-123' });
        });
    });

    describe('describeChangeSetHooks()', () => {
        it('should aggregate hooks across pages', async () => {
            cloudFormationMock
                .on(DescribeChangeSetHooksCommand)
                .resolvesOnce({ Hooks: [{ TypeName: 'Hook::One' }], NextToken: 'next' })
                .resolvesOnce({ Hooks: [{ TypeName: 'Hook::Two' }] });

            const result = await service.describeChangeSetHooks({ ChangeSetName: 'chs-1' });

            expect(result.Hooks).toHaveLength(2);
            expect(cloudFormationMock.commandCalls(DescribeChangeSetHooksCommand)).toHaveLength(2);
        });
    });
});
