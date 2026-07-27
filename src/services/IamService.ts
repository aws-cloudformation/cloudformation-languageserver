import { IAMClient, ListRolesCommand, CreateRoleCommand, PutRolePolicyCommand } from '@aws-sdk/client-iam';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { markIfClientError } from '../utils/errors/FaultSuppression';
import { AwsClient } from './AwsClient';
import { getCallerAccountId } from './CallerIdentity';

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

    @Measure({ name: 'listRoles' })
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

    @Measure({ name: 'createHookExecutionRole' })
    public async createHookExecutionRole(roleName: string, ruleBucket?: string): Promise<IamRole> {
        if (ruleBucket !== undefined && !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(ruleBucket)) {
            throw new Error(`Invalid S3 bucket name: ${ruleBucket}`);
        }
        const accountId = await getCallerAccountId(this.awsClient);
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
}
