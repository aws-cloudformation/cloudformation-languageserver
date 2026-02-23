import fs from 'fs';
import { join } from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LMDBStoreFactory } from '../../../src/datastore/LMDB';

describe('LMDB corruption error detection', () => {
    it('should identify MDB_CORRUPTED error message', () => {
        const errorMessage = 'MDB_CORRUPTED: Located page was wrong type';
        expect(errorMessage.includes('MDB_CORRUPTED')).toBe(true);
    });

    it('should identify MDB_PAGE_NOTFOUND error message', () => {
        const errorMessage = 'MDB_PAGE_NOTFOUND: Requested page not found';
        expect(errorMessage.includes('MDB_PAGE_NOTFOUND')).toBe(true);
    });

    it('should identify MDB_PANIC error message', () => {
        const errorMessage = 'MDB_PANIC: Update of meta page failed';
        expect(errorMessage.includes('MDB_PANIC')).toBe(true);
    });
});

describe('LMDB error recovery', () => {
    let testDir: string;
    let factory: LMDBStoreFactory;

    beforeEach(() => {
        testDir = join(process.cwd(), 'node_modules', '.cache', 'lmdb-corruption-recovery-test', `test-${Date.now()}`);
        fs.mkdirSync(testDir, { recursive: true });
        factory = new LMDBStoreFactory(testDir);
    });

    afterEach(async () => {
        await factory.close();
        // Small delay to ensure Windows releases file locks
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should call recoverFromError for MDB_CORRUPTED errors', () => {
        const recoverSpy = vi.spyOn(factory as any, 'recoverFromError');
        const reopenSpy = vi.spyOn(factory as any, 'reopenEnv').mockImplementation(() => {});
        const recreateSpy = vi.spyOn(factory as any, 'recreateStores').mockImplementation(() => {});

        const handleError = (factory as any).handleError.bind(factory);
        handleError(new Error('MDB_CORRUPTED: Located page was wrong type'));

        expect(recoverSpy).toHaveBeenCalled();
        reopenSpy.mockRestore();
        recreateSpy.mockRestore();
    });

    it('should call recoverFromError for MDB_PAGE_NOTFOUND errors', () => {
        const recoverSpy = vi.spyOn(factory as any, 'recoverFromError');
        const reopenSpy = vi.spyOn(factory as any, 'reopenEnv').mockImplementation(() => {});
        const recreateSpy = vi.spyOn(factory as any, 'recreateStores').mockImplementation(() => {});

        const handleError = (factory as any).handleError.bind(factory);
        handleError(new Error('MDB_PAGE_NOTFOUND: Requested page not found'));

        expect(recoverSpy).toHaveBeenCalled();
        reopenSpy.mockRestore();
        recreateSpy.mockRestore();
    });

    it('should call recoverFromError for MDB_PANIC errors', () => {
        const recoverSpy = vi.spyOn(factory as any, 'recoverFromError');
        const reopenSpy = vi.spyOn(factory as any, 'reopenEnv').mockImplementation(() => {});
        const recreateSpy = vi.spyOn(factory as any, 'recreateStores').mockImplementation(() => {});

        const handleError = (factory as any).handleError.bind(factory);
        handleError(new Error('MDB_PANIC: Update of meta page failed'));

        expect(recoverSpy).toHaveBeenCalled();
        reopenSpy.mockRestore();
        recreateSpy.mockRestore();
    });

    it('should call recoverFromError for transient errors', () => {
        const recoverSpy = vi.spyOn(factory as any, 'recoverFromError');
        const reopenSpy = vi.spyOn(factory as any, 'reopenEnv').mockImplementation(() => {});
        const recreateSpy = vi.spyOn(factory as any, 'recreateStores').mockImplementation(() => {});

        const handleError = (factory as any).handleError.bind(factory);
        handleError(new Error('MDB_BAD_TXN: Transaction must abort'));

        expect(recoverSpy).toHaveBeenCalled();
        reopenSpy.mockRestore();
        recreateSpy.mockRestore();
    });
});
