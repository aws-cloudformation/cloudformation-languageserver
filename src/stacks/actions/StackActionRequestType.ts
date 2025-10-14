import {
    Parameter,
    Capability,
    ResourceChangeDetail,
    ResourceStatus,
    DetailedStatus,
} from '@aws-sdk/client-cloudformation';
import { DateTime } from 'luxon';
import { Parameter as EntityParameter } from '../../context/semantic/Entity';
import { Identifiable } from '../../protocol/LspTypes';

export type CreateStackActionParams = Identifiable & {
    uri: string;
    stackName: string;
    parameters?: Parameter[];
    capabilities?: Capability[];
};

export type CreateStackActionResult = Identifiable & {
    changeSetName: string;
    stackName: string;
};

export type TemplateUri = string;

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
        beforeContext?: string;
        afterContext?: string;
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

export enum StackActionState {
    IN_PROGRESS = 'IN_PROGRESS',
    SUCCESSFUL = 'SUCCESSFUL',
    FAILED = 'FAILED',
}

export type GetStackActionStatusResult = Identifiable & {
    state: StackActionState;
    phase: StackActionPhase;
    changes?: StackChange[]; // TODO: move this property to the describe call results
};

export type ValidationDetail = {
    ValidationName: string;
    LogicalId?: string;
    ResourcePropertyPath?: string;
    Timestamp: DateTime;
    Severity: 'INFO' | 'ERROR';
    Message: string;
};

export type DeploymentEvent = {
    LogicalResourceId?: string;
    ResourceType?: string;
    Timestamp?: DateTime;
    ResourceStatus?: ResourceStatus;
    ResourceStatusReason?: string;
    DetailedStatus?: DetailedStatus;
};

export type DescribeValidationStatusResult = GetStackActionStatusResult & {
    ValidationDetails?: ValidationDetail[];
    FailureReason?: string;
};

export type DescribeDeploymentStatusResult = DescribeValidationStatusResult & {
    DeploymentEvents?: DeploymentEvent[];
};
