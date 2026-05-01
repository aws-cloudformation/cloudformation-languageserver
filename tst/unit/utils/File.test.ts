import { randomUUID as v4 } from 'crypto';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { rename } from 'fs/promises';
import { join } from 'path';
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import {
    asyncDirSync,
    asyncFileSync,
    asyncRenameWithRetry,
    isFileNotFoundError,
    readBufferIfExists,
    readBufferIfExistsAsync,
    readFileIfExists,
    readFileIfExistsAsync,
} from '../../../src/utils/File';

// Capture the real rename before mocking so we can delegate to it without recursion
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const { rename: realRename } = await vi.hoisted(async () => await import('fs/promises'));

vi.mock('fs/promises', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs/promises')>();
    return { ...actual, rename: vi.fn(actual.rename) };
});

describe('File', () => {
    const testDir = join(process.cwd(), 'node_modules', '.cache', 'file-tests', v4());
    const textFile = join(testDir, 'text.txt');
    const binaryFile = join(testDir, 'binary.bin');
    const textContent = 'hello world 🌍';
    const binaryContent = Buffer.from('CloudFormation template 🚀', 'utf8');
    const nonexistentPath = join(testDir, 'does-not-exist.txt');

    const mockedRename = vi.mocked(rename);

    beforeAll(() => {
        mkdirSync(testDir, { recursive: true });
        writeFileSync(textFile, textContent, 'utf8');
        writeFileSync(binaryFile, binaryContent);
    });

    afterAll(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    describe('readFileIfExists', () => {
        it('should return file content as string', () => {
            expect(readFileIfExists(textFile)).toBe(textContent);
        });

        it('should accept encoding options object', () => {
            expect(readFileIfExists(textFile, { encoding: 'utf8' })).toBe(textContent);
        });

        it('should throw for nonexistent path', () => {
            expect(() => readFileIfExists(nonexistentPath)).toThrow('does not exist');
        });
    });

    describe('readFileIfExistsAsync', () => {
        it('should return file content as string', async () => {
            await expect(readFileIfExistsAsync(textFile)).resolves.toBe(textContent);
        });

        it('should throw for nonexistent path', async () => {
            await expect(readFileIfExistsAsync(nonexistentPath)).rejects.toThrow('does not exist');
        });
    });

    describe('readBufferIfExists', () => {
        it('should return file content as buffer', () => {
            const result = readBufferIfExists(binaryFile);
            expect(Buffer.isBuffer(result)).toBe(true);
            expect(Buffer.compare(result, binaryContent)).toBe(0);
        });

        it('should throw for nonexistent path', () => {
            expect(() => readBufferIfExists(nonexistentPath)).toThrow('does not exist');
        });
    });

    describe('readBufferIfExistsAsync', () => {
        it('should return file content as buffer', async () => {
            const result = await readBufferIfExistsAsync(binaryFile);
            expect(Buffer.isBuffer(result)).toBe(true);
            expect(Buffer.compare(result, binaryContent)).toBe(0);
        });

        it('should accept options parameter', async () => {
            const result = await readBufferIfExistsAsync(binaryFile, null);
            expect(Buffer.compare(result, binaryContent)).toBe(0);
        });

        it('should throw DoesNotExist for nonexistent path', async () => {
            await expect(readBufferIfExistsAsync(nonexistentPath)).rejects.toThrow('does not exist');
        });
    });

    describe('asyncRenameWithRetry', () => {
        const renameDir = join(testDir, 'rename');

        beforeEach(() => {
            mkdirSync(renameDir, { recursive: true });
            mockedRename.mockRestore();
        });

        afterEach(() => {
            rmSync(renameDir, { recursive: true, force: true });
            mockedRename.mockRestore();
        });

        it('should rename file on first attempt', async () => {
            const source = join(renameDir, 'source.txt');
            const destination = join(renameDir, 'destination.txt');
            writeFileSync(source, 'rename-me');

            await asyncRenameWithRetry(source, destination);

            expect(readFileIfExists(destination)).toBe('rename-me');
        });

        it('should retry on transient EPERM errors and succeed', async () => {
            const source = join(renameDir, 'retry-source.txt');
            const destination = join(renameDir, 'retry-dest.txt');
            writeFileSync(source, 'retry-content');

            const epermError = Object.assign(new Error('EPERM'), { code: 'EPERM' });
            mockedRename
                .mockRejectedValueOnce(epermError)
                .mockRejectedValueOnce(epermError)
                .mockImplementationOnce(realRename);

            await asyncRenameWithRetry(source, destination, 5, 1);

            expect(mockedRename).toHaveBeenCalledTimes(3);
        });

        it('should throw non-retriable errors immediately', async () => {
            const source = join(renameDir, 'fail-source.txt');
            const destination = join(renameDir, 'fail-dest.txt');
            writeFileSync(source, 'fail-content');

            const unknownError = Object.assign(new Error('UNKNOWN'), { code: 'UNKNOWN' });
            mockedRename.mockRejectedValueOnce(unknownError);

            await expect(asyncRenameWithRetry(source, destination, 3, 1)).rejects.toThrow('UNKNOWN');
            expect(mockedRename).toHaveBeenCalledTimes(1);
        });

        it('should throw after exhausting all retries', async () => {
            const source = join(renameDir, 'exhaust-source.txt');
            const destination = join(renameDir, 'exhaust-dest.txt');
            writeFileSync(source, 'exhaust-content');

            const busyError = Object.assign(new Error('EBUSY'), { code: 'EBUSY' });
            mockedRename.mockRejectedValue(busyError);

            await expect(asyncRenameWithRetry(source, destination, 2, 1)).rejects.toThrow('EBUSY');
            expect(mockedRename).toHaveBeenCalledTimes(2);
        });
    });

    describe('asyncFileSync', () => {
        it('should fsync an existing file without error', async () => {
            const syncFile = join(testDir, 'sync-target.txt');
            writeFileSync(syncFile, 'sync-content');

            await expect(asyncFileSync(syncFile)).resolves.toBeUndefined();
        });

        it('should throw for nonexistent file', async () => {
            await expect(asyncFileSync(join(testDir, 'no-such-file.txt'))).rejects.toThrow();
        });
    });

    describe('asyncDirSync', () => {
        it('should fsync an existing directory without error', async () => {
            const syncDir = join(testDir, 'sync-dir');
            mkdirSync(syncDir, { recursive: true });

            await expect(asyncDirSync(syncDir)).resolves.toBeUndefined();
        });

        it('should not throw for nonexistent directory', async () => {
            await expect(asyncDirSync(join(testDir, 'no-such-dir'))).resolves.toBeUndefined();
        });
    });

    describe('isFileNotFoundError', () => {
        it('should return true for ENOENT error', () => {
            const enoentError = Object.assign(new Error('not found'), { code: 'ENOENT' });
            expect(isFileNotFoundError(enoentError)).toBe(true);
        });

        it('should return false for other error codes', () => {
            const epermError = Object.assign(new Error('permission denied'), { code: 'EPERM' });
            expect(isFileNotFoundError(epermError)).toBe(false);
        });

        it('should return false for error without code', () => {
            expect(isFileNotFoundError(new Error('generic error'))).toBe(false);
        });

        it('should return false for objects without code property', () => {
            expect(isFileNotFoundError({ message: 'no code' })).toBe(false);
            expect(isFileNotFoundError(42)).toBe(false);
        });
    });
});
