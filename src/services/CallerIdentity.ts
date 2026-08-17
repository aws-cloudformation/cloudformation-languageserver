import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { markIfClientError } from '../utils/errors/FaultSuppression';
import { AwsClient } from './AwsClient';

const log = LoggerFactory.getLogger('CallerIdentity');

export async function getCallerAccountId(awsClient: AwsClient): Promise<string> {
    const sts = awsClient.getStsClient();
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
