import { StackChange } from './StackActionRequestType';
import { Validation } from './Validation';

export class ValidationManager {
    private readonly validations: Map<string, Validation> = new Map();

    add(validation: Validation): void {
        this.validations.set(validation.getStackName(), validation);
    }

    get(stackName: string): Validation | undefined {
        return this.validations.get(stackName);
    }

    setChanges(stackName: string, changes: StackChange[]): void {
        const validation = this.validations.get(stackName);
        if (validation) {
            validation.setChanges(changes);
        }
    }

    remove(stackName: string): boolean {
        return this.validations.delete(stackName);
    }

    clear(): void {
        this.validations.clear();
    }
}
