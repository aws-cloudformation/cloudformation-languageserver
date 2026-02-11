import { arch, machine, platform, release, type } from 'os';
import { AwsMetadata, ClientInfo } from '../server/InitParams';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { TelemetryService } from '../telemetry/TelemetryService';
import { ProcessType, Service, ServiceEnv } from '../utils/Environment';
import { ExtensionName } from '../utils/ExtensionConfig';
import { Storage } from '../utils/Storage';

export function staticInitialize(ClientInfo?: ClientInfo, AwsMetadata?: AwsMetadata) {
    Storage.initialize(AwsMetadata?.storageDir);
    LoggerFactory.initialize(AwsMetadata?.logLevel);
    LoggerFactory.getLogger('Init').info(
        {
            Service: Service,
            Environment: ServiceEnv,
            Process: ProcessType,
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
