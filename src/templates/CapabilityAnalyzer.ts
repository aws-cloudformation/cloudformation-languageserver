import { Capability } from '@aws-sdk/client-cloudformation';
import { Document } from '../document/Document';
import { CfnService } from '../services/CfnService';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('CapabilityAnalyzer');

export async function analyzeCapabilities(document: Document, cfnService: CfnService): Promise<Capability[]> {
    try {
        const validationResult = await cfnService.validateTemplate({ TemplateBody: document.getText() });

        if (!validationResult.Capabilities) {
            return [];
        }

        // ValidateTemplate cannot process transforms, assume all capabilities are required if a transform is detected
        if (validationResult.Capabilities.includes(Capability.CAPABILITY_AUTO_EXPAND)) {
            return [Capability.CAPABILITY_IAM, Capability.CAPABILITY_NAMED_IAM, Capability.CAPABILITY_AUTO_EXPAND];
        }

        return validationResult.Capabilities;
    } catch (error) {
        log.warn({ error }, 'Capability Analysis failed, assuming all capabilities are required');
        return [Capability.CAPABILITY_IAM, Capability.CAPABILITY_NAMED_IAM, Capability.CAPABILITY_AUTO_EXPAND];
    }
}
