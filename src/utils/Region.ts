// https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/resource-type-schemas.html
import { dashesToUnderscores } from './String';

// Make sure keys and values are exactly the same (ignore casing, '-', '_')
export enum AwsRegion {
    US_EAST_1 = 'us-east-1',
    US_EAST_2 = 'us-east-2',
    US_WEST_1 = 'us-west-1',
    US_WEST_2 = 'us-west-2',

    CA_CENTRAL_1 = 'ca-central-1',
    CA_WEST_1 = 'ca-west-1',

    SA_EAST_1 = 'sa-east-1',

    EU_NORTH_1 = 'eu-north-1',
    EU_WEST_1 = 'eu-west-1',
    EU_WEST_2 = 'eu-west-2',
    EU_WEST_3 = 'eu-west-3',
    EU_CENTRAL_1 = 'eu-central-1',
    EU_CENTRAL_2 = 'eu-central-2',
    EU_SOUTH_1 = 'eu-south-1',
    EU_SOUTH_2 = 'eu-south-2',

    AP_EAST_1 = 'ap-east-1',
    AP_SOUTH_1 = 'ap-south-1',
    AP_SOUTH_2 = 'ap-south-2',
    AP_NORTHEAST_1 = 'ap-northeast-1',
    AP_NORTHEAST_2 = 'ap-northeast-2',
    AP_NORTHEAST_3 = 'ap-northeast-3',
    AP_SOUTHEAST_1 = 'ap-southeast-1',
    AP_SOUTHEAST_2 = 'ap-southeast-2',
    AP_SOUTHEAST_3 = 'ap-southeast-3',
    AP_SOUTHEAST_4 = 'ap-southeast-4',

    ME_SOUTH_1 = 'me-south-1',
    ME_CENTRAL_1 = 'me-central-1',
    AF_SOUTH_1 = 'af-south-1',

    US_GOV_EAST_1 = 'us-gov-east-1',
    US_GOV_WEST_1 = 'us-gov-west-1',

    IL_CENTRAL_1 = 'il-central-1',

    CN_NORTH_1 = 'cn-north-1',
    CN_NORTHWEST_1 = 'cn-northwest-1',
}

function isValidRegion(region: string) {
    return region in AwsRegion;
}

export function getRegion(region: unknown): AwsRegion {
    let enumKey = String(region).trim();
    if (!isValidRegion(enumKey)) {
        enumKey = enumKey.toUpperCase();
        if (!isValidRegion(enumKey)) {
            enumKey = dashesToUnderscores(enumKey);
        }
    }

    const value = AwsRegion[enumKey as keyof typeof AwsRegion];
    if (!value) {
        throw new Error(`Unknown region ${String(region)}`);
    }

    return value;
}
