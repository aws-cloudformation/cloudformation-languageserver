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
    private initializationError?: Error;
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
        while (this.isInitializationRequired()) {
            switch (this.status) {
                case InitializationStatus.Uninitialized: {
                    const generation = this.initializationGeneration;
                    this.status = InitializationStatus.Initializing;
                    this.initializationError = undefined;

                    let initializationPromise: Promise<void>;
                    try {
                        initializationPromise = this.initializeValidation();
                    } catch (error) {
                        if (generation === this.initializationGeneration) {
                            const initializationError = this.toInitializationError(error);
                            this.status = InitializationStatus.Failed;
                            this.initializationError = initializationError;
                            throw initializationError;
                        }
                        continue;
                    }

                    this.initPromise = initializationPromise;
                    await this.awaitInitialization(generation, initializationPromise);
                    break;
                }
                case InitializationStatus.Initializing: {
                    if (!this.initPromise) {
                        throw new Error('Validation initialization is in progress without an initialization promise.');
                    }
                    await this.awaitInitialization(this.initializationGeneration, this.initPromise);
                    break;
                }
                case InitializationStatus.Initialized: {
                    return true;
                }
                case InitializationStatus.Failed: {
                    throw this.initializationError ?? new Error('Validation initialization failed.');
                }
            }
        }

        return false;
    }

    private async awaitInitialization(generation: number, initializationPromise: Promise<void>): Promise<void> {
        try {
            await initializationPromise;
            if (generation === this.initializationGeneration) {
                this.status = InitializationStatus.Initialized;
                this.initializationError = undefined;
            }
        } catch (error) {
            if (generation === this.initializationGeneration) {
                const initializationError = this.toInitializationError(error);
                this.status = InitializationStatus.Failed;
                this.initializationError = initializationError;
                throw initializationError;
            }
        } finally {
            if (this.initPromise === initializationPromise) {
                this.initPromise = undefined;
            }
        }
    }

    private toInitializationError(error: unknown): Error {
        return error instanceof Error ? error : new Error(String(error));
    }

    protected resetInitialization(): void {
        this.initializationGeneration += 1;
        this.initPromise = undefined;
        this.initializationError = undefined;
        this.status = InitializationStatus.Uninitialized;
    }
}
