import { arch, machine, platform, release, type } from 'os';
import { AwsMetadata, ClientInfo } from '../server/InitParams';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';
import { AwsEnv, NodeEnv, ProcessPlatform } from '../utils/Environment';
import { ExtensionId, ExtensionName, ExtensionVersion } from '../utils/ExtensionConfig';
import { Storage } from '../utils/Storage';

export function staticInitialize(ClientInfo?: ClientInfo, AwsMetadata?: AwsMetadata) {
    Storage.initialize(AwsMetadata?.storageDir);
    LoggerFactory.initialize(AwsMetadata?.logLevel);
    LoggerFactory.getLogger('Init').info(
        {
            Service: `${ExtensionId}-${ExtensionVersion}`,
            Environment: `${NodeEnv}-${AwsEnv}`,
            Process: `${ProcessPlatform}-${process.arch}`,
            Machine: `${type()}-${platform()}-${arch()}-${machine()}-${release()}`,
            Runtime: `node=${process.versions.node} v8=${process.versions.v8} uv=${process.versions.uv} modules=${process.versions.modules}`,
            ClientInfo,
            aws: {
                clientInfo: AwsMetadata?.clientInfo,
                telemetryEnabled: AwsMetadata?.telemetryEnabled,
                logLevel: AwsMetadata?.logLevel,
                cloudformation: AwsMetadata?.cloudformation,
            },
        },
        `${ExtensionName} initializing...`,
    );

    TelemetryService.initialize(ClientInfo, AwsMetadata);
}
