export enum InitializationStatus {
    Uninitialized = 0,
    Initializing = 1,
    Initialized = 2,
    Failed = 3,
}

export enum ValidationTrigger {
    OnOpen = 'onOpen',
    OnChange = 'onChange',
    OnSave = 'onSave',
}

export abstract class DeferredValidationInitializer {
    private initPromise?: Promise<void>;
    private initializationGeneration = 0;
    protected status = InitializationStatus.Uninitialized;

    protected constructor(
        private readonly isEnabled: () => boolean,
        private readonly hasValidationDocuments: () => boolean,
        private readonly initializeValidation: () => Promise<void>,
    ) {}

    protected isInitializationRequired(): boolean {
        return this.isEnabled() && this.hasValidationDocuments();
    }

    protected async initializeIfRequired(): Promise<boolean> {
        if (!this.isInitializationRequired()) {
            return false;
        }

        if (this.status === InitializationStatus.Uninitialized) {
            const generation = this.initializationGeneration;
            this.status = InitializationStatus.Initializing;
            const initializationPromise = this.initializeValidation();
            this.initPromise = initializationPromise;

            try {
                await initializationPromise;
                if (generation === this.initializationGeneration) {
                    this.status = InitializationStatus.Initialized;
                }
            } catch (error) {
                if (generation === this.initializationGeneration) {
                    this.status = InitializationStatus.Failed;
                }
                throw error;
            } finally {
                if (this.initPromise === initializationPromise) {
                    this.initPromise = undefined;
                }
            }
        } else if (this.status === InitializationStatus.Initializing && this.initPromise) {
            await this.initPromise;
        }

        return true;
    }

    protected resetInitialization(): void {
        this.initializationGeneration += 1;
        this.initPromise = undefined;
        this.status = InitializationStatus.Uninitialized;
    }
}
