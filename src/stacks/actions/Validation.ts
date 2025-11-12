import { Parameter, Capability } from '@aws-sdk/client-cloudformation';
import { StackActionPhase, StackChange, ValidationDetail } from './StackActionRequestType';

export class Validation {
    private readonly uri: string;
    private readonly stackName: string;
    private readonly changeSetName: string;
    private readonly parameters?: Parameter[];
    private capabilities?: Capability[];
    private readonly s3Bucket?: string;
    private readonly s3Key?: string;
    private phase: StackActionPhase | undefined;
    private changes: StackChange[] | undefined;
    private validationDetails: ValidationDetail[] | undefined;

    constructor(
        uri: string,
        stackName: string,
        changeSetName: string,
        parameters?: Parameter[],
        capabilities?: Capability[],
        s3Bucket?: string,
        s3Key?: string,
    ) {
        this.uri = uri;
        this.stackName = stackName;
        this.changeSetName = changeSetName;
        this.parameters = parameters;
        this.capabilities = capabilities;
        this.s3Bucket = s3Bucket;
        this.s3Key = s3Key;
    }

    getUri(): string {
        return this.uri;
    }

    getStackName(): string {
        return this.stackName;
    }

    getChangeSetName(): string {
        return this.changeSetName;
    }

    getParameters(): Parameter[] | undefined {
        return this.parameters;
    }

    getPhase(): StackActionPhase | undefined {
        return this.phase;
    }

    setPhase(status: StackActionPhase): void {
        this.phase = status;
    }

    getChanges(): StackChange[] | undefined {
        return this.changes;
    }

    setChanges(changes: StackChange[]): void {
        this.changes = changes;
    }

    getCapabilities(): Capability[] | undefined {
        return this.capabilities;
    }

    setCapabilities(capabilities: Capability[]): void {
        this.capabilities = capabilities;
    }

    getS3Bucket(): string | undefined {
        return this.s3Bucket;
    }

    getS3Key(): string | undefined {
        return this.s3Key;
    }

    getValidationDetails(): ValidationDetail[] | undefined {
        return this.validationDetails;
    }

    setValidationDetails(validationDetails: ValidationDetail[]) {
        this.validationDetails = validationDetails;
    }

    removeValidationDetailByDiagnosticId(diagnosticId: string): void {
        if (this.validationDetails) {
            this.validationDetails = this.validationDetails.filter((vd) => vd.diagnosticId !== diagnosticId);
        }
    }
}
