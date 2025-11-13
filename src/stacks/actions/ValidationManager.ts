import { StackChange } from './StackActionRequestType';
import { Validation } from './Validation';

export class ValidationManager {
    private readonly validations: Map<string, Validation> = new Map();
    private readonly uriToValidation: Map<string, Validation> = new Map();

    add(validation: Validation): void {
        this.validations.set(validation.getStackName(), validation);
        this.uriToValidation.set(validation.getUri(), validation);
    }

    get(stackName: string): Validation | undefined {
        return this.validations.get(stackName);
    }

    getLastValidationByUri(uri: string): Validation | undefined {
        return this.uriToValidation.get(uri);
    }

    setChanges(stackName: string, changes: StackChange[]): void {
        const validation = this.validations.get(stackName);
        if (validation) {
            validation.setChanges(changes);
        }
    }

    remove(stackName: string): boolean {
        const validation = this.validations.get(stackName);
        if (validation) {
            this.uriToValidation.delete(validation.getUri());
        }
        return this.validations.delete(stackName);
    }

    clear(): void {
        this.validations.clear();
        this.uriToValidation.clear();
    }
}
