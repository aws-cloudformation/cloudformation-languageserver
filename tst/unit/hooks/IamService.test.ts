import { IAMClient, ListRolesCommand, CreateRoleCommand, PutRolePolicyCommand } from '@aws-sdk/client-iam';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { mockClient } from 'aws-sdk-client-mock';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AwsClient } from '../../../src/services/AwsClient';
import { IamService } from '../../../src/services/IamService';

const iamMock = mockClient(IAMClient);
const stsMock = mockClient(STSClient);
const mockGetIamClient = vi.fn();
const mockGetStsClient = vi.fn();

const mockClientComponent = {
    getIamClient: mockGetIamClient,
    getStsClient: mockGetStsClient,
} as unknown as AwsClient;

describe('IamService', () => {
    let service: IamService;

    beforeEach(() => {
        vi.clearAllMocks();
        iamMock.reset();
        stsMock.reset();
        mockGetIamClient.mockReturnValue(new IAMClient({}));
        mockGetStsClient.mockReturnValue(new STSClient({}));
        stsMock.on(GetCallerIdentityCommand).resolves({ Account: '123' });
        service = new IamService(mockClientComponent);
    });

    describe('listRoles()', () => {
        it('paginates and maps role name + arn, skipping incomplete roles', async () => {
            iamMock
                .on(ListRolesCommand, { Marker: undefined })
                .resolves({
                    Roles: [{ RoleName: 'roleA', Arn: 'arn:aws:iam::123:role/roleA' }, { RoleName: 'noArn' }] as never,
                    IsTruncated: true,
                    Marker: 'm2',
                })
                .on(ListRolesCommand, { Marker: 'm2' })
                .resolves({
                    Roles: [{ RoleName: 'roleB', Arn: 'arn:aws:iam::123:role/roleB' }] as never,
                    IsTruncated: false,
                });

            const roles = await service.listRoles();

            expect(roles).toEqual([
                { roleName: 'roleA', arn: 'arn:aws:iam::123:role/roleA' },
                { roleName: 'roleB', arn: 'arn:aws:iam::123:role/roleB' },
            ]);
        });
    });

    describe('createHookExecutionRole()', () => {
        it('creates a role with an account-scoped trust policy and no inline policy when no bucket given', async () => {
            iamMock.on(CreateRoleCommand).resolves({ Role: { Arn: 'arn:aws:iam::123:role/hookRole' } as never });

            const result = await service.createHookExecutionRole('hookRole');

            expect(result).toEqual({ roleName: 'hookRole', arn: 'arn:aws:iam::123:role/hookRole' });
            expect(iamMock.commandCalls(PutRolePolicyCommand)).toHaveLength(0);
            const trust = JSON.parse(
                iamMock.commandCalls(CreateRoleCommand)[0].args[0].input.AssumeRolePolicyDocument as string,
            );
            expect(trust.Statement[0].Condition.StringEquals['aws:SourceAccount']).toBe('123');
            expect(trust.Statement[0].Principal.Service).toBe('hooks.cloudformation.amazonaws.com');
        });

        it('attaches an inline S3 read policy scoped to the given bucket', async () => {
            iamMock.on(CreateRoleCommand).resolves({ Role: { Arn: 'arn:aws:iam::123:role/hookRole' } as never });
            iamMock.on(PutRolePolicyCommand).resolves({});

            await service.createHookExecutionRole('hookRole', 'my-rule-bucket');

            const policyCall = iamMock.commandCalls(PutRolePolicyCommand)[0];
            const policy = JSON.parse(policyCall.args[0].input.PolicyDocument as string);
            expect(policy.Statement[0].Resource).toEqual([
                'arn:aws:s3:::my-rule-bucket',
                'arn:aws:s3:::my-rule-bucket/*',
            ]);
        });

        it('rejects an invalid bucket name before making any AWS calls', async () => {
            await expect(service.createHookExecutionRole('hookRole', 'Invalid_Bucket!')).rejects.toThrow(
                /Invalid S3 bucket name/,
            );
            expect(iamMock.commandCalls(CreateRoleCommand)).toHaveLength(0);
            expect(stsMock.commandCalls(GetCallerIdentityCommand)).toHaveLength(0);
        });

        it('throws when CreateRole returns no ARN', async () => {
            iamMock.on(CreateRoleCommand).resolves({ Role: {} as never });

            await expect(service.createHookExecutionRole('hookRole')).rejects.toThrow(/no ARN/);
        });

        it('propagates STS failures when resolving the account id', async () => {
            stsMock.on(GetCallerIdentityCommand).rejects(new Error('sts-down'));

            await expect(service.createHookExecutionRole('hookRole')).rejects.toThrow('sts-down');
        });
    });
});
