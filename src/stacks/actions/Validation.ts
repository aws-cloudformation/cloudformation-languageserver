import { Parameter, Capability } from '@aws-sdk/client-cloudformation';
import { StackActionPhase, StackChange } from './StackActionRequestType';

export class Validation {
    private readonly uri: string;
    private readonly stackName: string;
    private readonly changeSetName: string;
    private readonly parameters?: Parameter[];
    private capabilities?: Capability[];
    private phase: StackActionPhase | undefined;
    private changes: StackChange[] | undefined;

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
}
