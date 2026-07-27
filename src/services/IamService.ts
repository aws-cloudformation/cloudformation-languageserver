import { IAMClient, ListRolesCommand, CreateRoleCommand, PutRolePolicyCommand } from '@aws-sdk/client-iam';
import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { markIfClientError } from '../utils/errors/FaultSuppression';
import { AwsClient } from './AwsClient';

const log = LoggerFactory.getLogger('IamService');

export interface IamRole {
    roleName: string;
    arn: string;
}

export class IamService {
    constructor(private readonly awsClient: AwsClient) {}

    private async withClient<T>(request: (client: IAMClient) => Promise<T>): Promise<T> {
        try {
            const client = this.awsClient.getIamClient();
            return await request(client);
        } catch (error) {
            log.error(error, 'IAM API call failed');
            markIfClientError(error);
            throw error;
        }
    }

    /**
     * List IAM roles in the account, paginating up to `maxRoles` (default 1000).
     * Returns role name + ARN for populating a role picker.
     */
    @Measure({ name: 'listRoles', captureErrorType: true })
    public async listRoles(maxRoles = 1000): Promise<IamRole[]> {
        return await this.withClient(async (client) => {
            const roles: IamRole[] = [];
            let marker: string | undefined;
            do {
                const response = await client.send(new ListRolesCommand({ Marker: marker, MaxItems: 100 }));
                for (const role of response.Roles ?? []) {
                    if (role.RoleName && role.Arn) {
                        roles.push({ roleName: role.RoleName, arn: role.Arn });
                    }
                }
                marker = response.IsTruncated ? response.Marker : undefined;
            } while (marker && roles.length < maxRoles);
            return roles;
        });
    }

    /**
     * Create an IAM role a Guard Hook can assume: trusts hooks.cloudformation.amazonaws.com
     * scoped to this account (aws:SourceAccount) and, when a rule bucket is given, attaches an
     * inline policy granting read on just that bucket. Returns the new role's name and ARN.
     */
    @Measure({ name: 'createHookExecutionRole', captureErrorType: true })
    public async createHookExecutionRole(roleName: string, ruleBucket?: string): Promise<IamRole> {
        if (ruleBucket !== undefined && !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(ruleBucket)) {
            throw new Error(`Invalid S3 bucket name: ${ruleBucket}`);
        }
        const accountId = await this.getCallerAccountId();
        const trustPolicy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { Service: 'hooks.cloudformation.amazonaws.com' },
                    Action: 'sts:AssumeRole',
                    Condition: { StringEquals: { 'aws:SourceAccount': accountId } },
                },
            ],
        };

        return await this.withClient(async (client) => {
            const created = await client.send(
                new CreateRoleCommand({
                    RoleName: roleName,
                    AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
                    Description: 'Execution role for a CloudFormation Guard Hook (created by the AWS Toolkit).',
                }),
            );
            if (ruleBucket) {
                const s3ReadPolicy = {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Action: ['s3:GetObject', 's3:GetObjectVersion', 's3:ListBucket'],
                            Resource: [`arn:aws:s3:::${ruleBucket}`, `arn:aws:s3:::${ruleBucket}/*`],
                        },
                    ],
                };
                await client.send(
                    new PutRolePolicyCommand({
                        RoleName: roleName,
                        PolicyName: 'GuardHookS3ReadAccess',
                        PolicyDocument: JSON.stringify(s3ReadPolicy),
                    }),
                );
            }
            const arn = created.Role?.Arn;
            if (!arn) {
                throw new Error(`CreateRole returned no ARN for role ${roleName}`);
            }
            return { roleName, arn };
        });
    }

    private async getCallerAccountId(): Promise<string> {
        const sts = this.awsClient.getStsClient();
        try {
            const identity = await sts.send(new GetCallerIdentityCommand({}));
            if (!identity.Account) {
                throw new Error('STS GetCallerIdentity did not return an account ID');
            }
            return identity.Account;
        } catch (error) {
            log.error(error, 'Failed to resolve caller account ID via STS');
            markIfClientError(error);
            throw error;
        }
    }
}
