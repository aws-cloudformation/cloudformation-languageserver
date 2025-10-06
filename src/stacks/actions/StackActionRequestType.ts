import { Parameter, Capability, ResourceChangeDetail } from '@aws-sdk/client-cloudformation';
import { Parameter as EntityParameter } from '../../context/semantic/Entity';
import { Identifiable } from '../../protocol/LspTypes';

export type StackActionParams = Identifiable & {
    uri: string;
    stackName: string;
    parameters?: Parameter[];
    capabilities?: Capability[];
};

export type StackActionResult = Identifiable & {
    id: string;
    changeSetName: string;
    stackName: string;
};

export type StackActionMetadataParams = {
    uri: string;
};

export type GetParametersResult = {
    parameters: EntityParameter[];
};

export type GetCapabilitiesResult = {
    capabilities: Capability[];
};

export type StackChange = {
    type?: string;
    resourceChange?: {
        action?: string;
        logicalResourceId?: string;
        physicalResourceId?: string;
        resourceType?: string;
        replacement?: string;
        scope?: string[];
        details?: ResourceChangeDetail[];
    };
};

export enum StackActionPhase {
    VALIDATION_STARTED = 'VALIDATION_STARTED',
    DEPLOYMENT_STARTED = 'DEPLOYMENT_STARTED',
    VALIDATION_IN_PROGRESS = 'VALIDATION_IN_PROGRESS',
    DEPLOYMENT_IN_PROGRESS = 'DEPLOYMENT_IN_PROGRESS',
    VALIDATION_COMPLETE = 'VALIDATION_COMPLETE',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    DEPLOYMENT_COMPLETE = 'DEPLOYMENT_COMPLETE',
    DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
}

export enum StackActionStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    SUCCESSFUL = 'SUCCESSFUL',
    FAILED = 'FAILED',
}

export type StackActionStatusResult = Identifiable & {
    status: StackActionStatus;
    phase: StackActionPhase;
    changes?: StackChange[];
};
