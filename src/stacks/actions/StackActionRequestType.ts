import {
    Parameter,
    Capability,
    ResourceStatus,
    DetailedStatus,
} from '@aws-sdk/client-cloudformation';
import { DateTime } from 'luxon';
import { Parameter as EntityParameter } from '../../context/semantic/Entity';
import { Identifiable } from '../../protocol/LspTypes';
import { ResourceChangeDetailV2 } from '../../services/CfnServiceV2';

export type ResourceToImport = {
    ResourceType: string;
    LogicalResourceId: string;
    ResourceIdentifier: Record<string, string>;
};

export type CreateValidationParams = Identifiable & {
    uri: string;
    stackName: string;
    parameters?: Parameter[];
    capabilities?: Capability[];
    resourcesToImport?: ResourceToImport[];
    keepChangeSet?: boolean;
};

export type ChangeSetReference = {
    changeSetName: string;
    stackName: string;
};

export type CreateDeploymentParams = Identifiable & ChangeSetReference;

export type DeleteChangeSetParams = Identifiable & ChangeSetReference;

export type CreateStackActionResult = Identifiable & ChangeSetReference;

export type TemplateUri = string;

export type GetParametersResult = {
    parameters: EntityParameter[];
};

export type GetCapabilitiesResult = {
    capabilities: Capability[];
};

export type TemplateResource = {
    logicalId: string;
    type: string;
    primaryIdentifierKeys?: string[];
    primaryIdentifier?: Record<string, string>;
};

export type GetTemplateResourcesResult = {
    resources: TemplateResource[];
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
        resourceDriftStatus?: string;
        details?: ResourceChangeDetailV2[];
    };
};

export enum StackActionPhase {
    VALIDATION_STARTED = 'VALIDATION_STARTED',
    VALIDATION_IN_PROGRESS = 'VALIDATION_IN_PROGRESS',
    VALIDATION_COMPLETE = 'VALIDATION_COMPLETE',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    DEPLOYMENT_STARTED = 'DEPLOYMENT_STARTED',
    DEPLOYMENT_IN_PROGRESS = 'DEPLOYMENT_IN_PROGRESS',
    DEPLOYMENT_COMPLETE = 'DEPLOYMENT_COMPLETE',
    DEPLOYMENT_FAILED = 'DEPLOYMENT_FAILED',
    DELETION_STARTED = 'DELETION_STARTED',
    DELETION_IN_PROGRESS = 'DELETION_IN_PROGRESS',
    DELETION_COMPLETE = 'DELETION_COMPLETE',
    DELETION_FAILED = 'DELETION_FAILED',
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

export type Failable = {
    FailureReason?: string;
};

export type DescribeValidationStatusResult = GetStackActionStatusResult &
    Failable & {
        ValidationDetails?: ValidationDetail[];
    };

export type DescribeDeploymentStatusResult = GetStackActionStatusResult &
    Failable & {
        DeploymentEvents?: DeploymentEvent[];
    };

export type DescribeDeletionStatusResult = GetStackActionStatusResult & Failable;
