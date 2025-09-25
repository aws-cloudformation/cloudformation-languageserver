import { Parameter, Capability } from '@aws-sdk/client-cloudformation';
import { TemplateStatus, TemplateChange } from './TemplateRequestType';

export class Validation {
    private readonly uri: string;
    private readonly stackName: string;
    private readonly changeSetName: string;
    private readonly parameters?: Parameter[];
    private capabilities?: Capability[];
    private status: TemplateStatus | undefined;
    private changes: TemplateChange[] | undefined;

    constructor(
        uri: string,
        stackName: string,
        changeSetName: string,
        parameters?: Parameter[],
        capabilities?: Capability[],
    ) {
        this.uri = uri;
        this.stackName = stackName;
        this.changeSetName = changeSetName;
        this.parameters = parameters;
        this.capabilities = capabilities;
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

    getStatus(): TemplateStatus | undefined {
        return this.status;
    }

    setStatus(status: TemplateStatus): void {
        this.status = status;
    }

    getChanges(): TemplateChange[] | undefined {
        return this.changes;
    }

    setChanges(changes: TemplateChange[]): void {
        this.changes = changes;
    }

    getCapabilities(): Capability[] | undefined {
        return this.capabilities;
    }

    setCapabilities(capabilities: Capability[]): void {
        this.capabilities = capabilities;
    }
}
