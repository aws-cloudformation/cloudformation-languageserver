import { describe, expect, it, vi } from 'vitest';
import { DocumentManager } from '../../../src/document/DocumentManager';
import { DeferredValidationInitializer, InitializationStatus } from '../../../src/utils/ValidationUtils';

class TestValidationInitializer extends DeferredValidationInitializer {
    constructor(isEnabled: () => boolean, documentManager: DocumentManager, initializeValidation: () => Promise<void>) {
        super(isEnabled, documentManager, initializeValidation);
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

function createDocumentManager(hasValidTemplate: boolean): DocumentManager {
    return {
        hasValidTemplate: vi.fn(() => hasValidTemplate),
    } as unknown as DocumentManager;
}

describe('DeferredValidationInitializer', () => {
    it('should not initialize when no valid template is open', async () => {
        const initializeValidation = vi.fn<() => Promise<void>>().mockResolvedValue();
        const initializer = new TestValidationInitializer(
            () => true,
            createDocumentManager(false),
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
            createDocumentManager(true),
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
            createDocumentManager(true),
            initializeValidation,
        );

        const staleInitialization = initializer.initialize();
        initializer.reset();
        await expect(initializer.initialize()).resolves.toBe(true);

        rejectFirstInitialization(new Error('stale initialization failed'));
        await expect(staleInitialization).rejects.toThrow('stale initialization failed');
        expect(initializer.getStatus()).toBe(InitializationStatus.Initialized);
        expect(initializeValidation).toHaveBeenCalledTimes(2);
    });
});
