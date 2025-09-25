import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { AwsCredentialIdentity } from '@aws-sdk/types';
import { DeepReadonly } from 'ts-essentials';

export function sdkIAMCredentials(
    profile?: string,
    forceRefresh: boolean = true,
): Promise<DeepReadonly<AwsCredentialIdentity>> {
    if (!profile || profile.toLowerCase() === 'default') {
        return defaultProvider()({ forceRefresh });
    } else {
        return defaultProvider({ profile })({ forceRefresh });
    }
}
