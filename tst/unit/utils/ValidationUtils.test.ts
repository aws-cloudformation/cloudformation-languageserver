import { describe, expect, it, vi } from 'vitest';
import { DeferredValidationInitializer, InitializationStatus } from '../../../src/utils/ValidationUtils';

class TestValidationInitializer extends DeferredValidationInitializer {
    constructor(
        isEnabled: () => boolean,
        hasValidationDocuments: () => boolean,
        initializeValidation: () => Promise<void>,
    ) {
        super(isEnabled, hasValidationDocuments, initializeValidation);
    }

    initialize(): Promise<boolean> {
        return this.initializeIfRequired();
    }

    reset(): void {
        this.resetInitialization();
    }

    getStatus(): InitializationStatus {
        return this.status;
    }
}

function createValidationDocumentPredicate(hasValidTemplate: boolean): () => boolean {
    return () => hasValidTemplate;
}

describe('DeferredValidationInitializer', () => {
    it('should not initialize when no valid template is open', async () => {
        const initializeValidation = vi.fn<() => Promise<void>>().mockResolvedValue();
        const initializer = new TestValidationInitializer(
            () => true,
            createValidationDocumentPredicate(false),
            initializeValidation,
        );

        await expect(initializer.initialize()).resolves.toBe(false);
        expect(initializeValidation).not.toHaveBeenCalled();
        expect(initializer.getStatus()).toBe(InitializationStatus.Uninitialized);
    });

    it('should share one initialization between concurrent callers', async () => {
        let resolveInitialization!: () => void;
        const initialization = new Promise<void>((resolve) => {
            resolveInitialization = resolve;
        });
        const initializeValidation = vi.fn<() => Promise<void>>().mockReturnValue(initialization);
        const initializer = new TestValidationInitializer(
            () => true,
            createValidationDocumentPredicate(true),
            initializeValidation,
        );

        const first = initializer.initialize();
        const second = initializer.initialize();

        expect(initializeValidation).toHaveBeenCalledTimes(1);
        expect(initializer.getStatus()).toBe(InitializationStatus.Initializing);
        resolveInitialization();

        await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
        expect(initializer.getStatus()).toBe(InitializationStatus.Initialized);
    });

    it('should preserve and rethrow a current-generation initialization failure', async () => {
        const initializationError = new Error('initialization failed');
        const initializeValidation = vi.fn<() => Promise<void>>().mockRejectedValue(initializationError);
        const initializer = new TestValidationInitializer(
            () => true,
            createValidationDocumentPredicate(true),
            initializeValidation,
        );

        await expect(initializer.initialize()).rejects.toBe(initializationError);
        expect(initializer.getStatus()).toBe(InitializationStatus.Failed);

        await expect(initializer.initialize()).rejects.toBe(initializationError);
        expect(initializeValidation).toHaveBeenCalledTimes(1);
    });

    it('should ignore a stale failure after reset and successful reinitialization', async () => {
        let rejectFirstInitialization!: (error: Error) => void;
        const firstInitialization = new Promise<void>((_resolve, reject) => {
            rejectFirstInitialization = reject;
        });
        const initializeValidation = vi
            .fn<() => Promise<void>>()
            .mockReturnValueOnce(firstInitialization)
            .mockResolvedValueOnce();
        const initializer = new TestValidationInitializer(
            () => true,
            createValidationDocumentPredicate(true),
            initializeValidation,
        );

        const staleInitialization = initializer.initialize();
        initializer.reset();
        await expect(initializer.initialize()).resolves.toBe(true);

        rejectFirstInitialization(new Error('stale initialization failed'));
        await expect(staleInitialization).resolves.toBe(true);
        expect(initializer.getStatus()).toBe(InitializationStatus.Initialized);
        expect(initializeValidation).toHaveBeenCalledTimes(2);
    });

    it('should wait for a replacement generation after an in-flight initialization is reset', async () => {
        let resolveFirstInitialization!: () => void;
        let resolveReplacementInitialization!: () => void;
        const firstInitialization = new Promise<void>((resolve) => {
            resolveFirstInitialization = resolve;
        });
        const replacementInitialization = new Promise<void>((resolve) => {
            resolveReplacementInitialization = resolve;
        });
        const initializeValidation = vi
            .fn<() => Promise<void>>()
            .mockReturnValueOnce(firstInitialization)
            .mockReturnValueOnce(replacementInitialization);
        const initializer = new TestValidationInitializer(
            () => true,
            createValidationDocumentPredicate(true),
            initializeValidation,
        );

        const staleInitialization = initializer.initialize();
        initializer.reset();
        const replacement = initializer.initialize();
        const staleOutcome = staleInitialization.then(() => 'settled' as const);

        resolveFirstInitialization();
        const outcomeBeforeReplacement = await Promise.race([
            staleOutcome,
            new Promise<'pending'>((resolve) => {
                setImmediate(() => resolve('pending'));
            }),
        ]);
        expect(outcomeBeforeReplacement).toBe('pending');

        resolveReplacementInitialization();
        await expect(Promise.all([staleInitialization, replacement])).resolves.toEqual([true, true]);
        expect(initializer.getStatus()).toBe(InitializationStatus.Initialized);
        expect(initializeValidation).toHaveBeenCalledTimes(2);
    });
});
