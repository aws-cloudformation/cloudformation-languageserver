import { randomUUID as v4 } from 'crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, unlinkSync, utimesSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { LocalFile } from '../../../src/utils/LocalFile';
import { waitFor } from '../../utils/Utils';

describe('LocalFile', () => {
    const testDir = join(process.cwd(), 'node_modules', '.cache', 'localfile-tests', v4());
    const filePath = join(testDir, 'test-file.txt');

    beforeEach(() => {
        rmSync(testDir, { recursive: true, force: true });
        mkdirSync(testDir, { recursive: true });
    });

    describe('constructor', () => {
        it('should parse fileName and dirName from path', () => {
            const file = new LocalFile('/some/dir/file.txt');
            expect(file.fileName).toBe('file.txt');
            expect(file.dirName).toBe('/some/dir');
            expect(file.path).toBe('/some/dir/file.txt');
        });
    });

    describe('exists', () => {
        it('should return true when file exists', () => {
            writeFileSync(filePath, 'content');
            expect(new LocalFile(filePath).exists()).toBe(true);
        });

        it('should return false when file does not exist', () => {
            expect(new LocalFile(join(testDir, 'missing.txt')).exists()).toBe(false);
        });
    });

    describe('stats', () => {
        it('should return Stats for existing file', () => {
            writeFileSync(filePath, 'stats-content');
            const stats = new LocalFile(filePath).stats();
            expect(stats).toBeDefined();
            expect(stats!.isFile()).toBe(true);
        });

        it('should return undefined for nonexistent file', () => {
            expect(new LocalFile(join(testDir, 'missing.txt')).stats()).toBeUndefined();
        });
    });

    describe('isFile', () => {
        it('should return true for a regular file', () => {
            writeFileSync(filePath, 'data');
            expect(new LocalFile(filePath).isFile()).toBe(true);
        });

        it('should return false for a directory', () => {
            expect(new LocalFile(testDir).isFile()).toBe(false);
        });

        it('should return false for nonexistent path', () => {
            expect(new LocalFile(join(testDir, 'nope')).isFile()).toBe(false);
        });
    });

    describe('isDirectory', () => {
        it('should return true for a directory', () => {
            expect(new LocalFile(testDir).isDirectory()).toBe(true);
        });

        it('should return false for a regular file', () => {
            writeFileSync(filePath, 'data');
            expect(new LocalFile(filePath).isDirectory()).toBe(false);
        });

        it('should return false for nonexistent path', () => {
            expect(new LocalFile(join(testDir, 'nope')).isDirectory()).toBe(false);
        });
    });

    describe('fileBytes', () => {
        it('should return byte size of file', () => {
            const content = 'hello';
            writeFileSync(filePath, content);
            expect(new LocalFile(filePath).fileBytes()).toBe(Buffer.byteLength(content));
        });

        it('should return 0 for nonexistent file', () => {
            expect(new LocalFile(join(testDir, 'missing.txt')).fileBytes()).toBe(0);
        });
    });

    describe('read/write', () => {
        let tmpFile: string;
        let tmpLocalFile: LocalFile;

        beforeEach(() => {
            tmpFile = join(testDir, v4());
            tmpLocalFile = new LocalFile(tmpFile);
        });

        afterEach(() => {
            if (existsSync(tmpFile)) {
                unlinkSync(tmpFile);
            }
        });

        it('write', async () => {
            const data = v4();
            const result = await tmpLocalFile.write(data);

            expect(result).toBe(true);
            expect(readFileSync(tmpFile, 'utf8')).toBe(data);
            expect(readFileSync(tmpFile).equals(Buffer.from(data))).toBe(true);
        });

        it('should clean up stale tmp files after writing', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            try {
                writeFileSync(filePath, 'original');
                const staleTmp = `${filePath}.99999.1.tmp`;
                writeFileSync(staleTmp, 'stale');

                // Backdate the tmp file so it exceeds the 30-minute staleness threshold
                const oldTime = new Date(Date.now() - 31 * 60 * 1000);
                utimesSync(staleTmp, oldTime, oldTime);

                const localFile = new LocalFile(filePath);
                await localFile.write('new-content');

                // Advance past the 60s setTimeout to trigger deferred cleanup
                await vi.advanceTimersByTimeAsync(60 * 1000);
                // Allow the async cleanup to complete
                await vi.advanceTimersByTimeAsync(0);

                await waitFor(() => {
                    expect(existsSync(staleTmp)).toBe(false);
                    expect(readFileSync(filePath, 'utf8')).toBe('new-content');
                });
            } finally {
                vi.useRealTimers();
            }
        });

        it('should not leave tmp files after successful write', async () => {
            writeFileSync(filePath, 'original');
            const localFile = new LocalFile(filePath);

            await localFile.write('new-content');

            const tmpFiles = readdirSync(testDir).filter((f: string) => f.endsWith('.tmp'));
            expect(tmpFiles).toHaveLength(0);
        });

        it('read', async () => {
            const data = v4();
            writeFileSync(tmpFile, data);

            expect(tmpLocalFile.readString()).toBe(data);
            expect(await tmpLocalFile.readStringAsync()).toBe(data);

            expect(tmpLocalFile.readBytes()!.equals(Buffer.from(data))).toBe(true);
            expect((await tmpLocalFile.readBytesAsync())!.equals(Buffer.from(data))).toBe(true);
        });

        it('read (does not exist)', async () => {
            const missingFile = new LocalFile(join(testDir, v4()));

            expect(missingFile.readString()).toBeUndefined();
            expect(await missingFile.readStringAsync()).toBeUndefined();
            expect(missingFile.readBytes()).toBeUndefined();
            expect(await missingFile.readBytesAsync()).toBeUndefined();
        });
    });

    describe('remove', () => {
        it('should delete the file and return true', async () => {
            writeFileSync(filePath, 'to-delete');
            const localFile = new LocalFile(filePath);

            const result = await localFile.remove();

            expect(result).toBe(true);
            expect(existsSync(filePath)).toBe(false);
        });

        it('should return true when file is already gone', async () => {
            writeFileSync(filePath, 'placeholder');
            const localFile = new LocalFile(filePath);

            // Remove the file before calling remove() so unlink gets ENOENT
            rmSync(filePath);

            const result = await localFile.remove();
            expect(result).toBe(true);
        });
    });

    describe('removeSync', () => {
        it('should delete the file synchronously', () => {
            writeFileSync(filePath, 'sync-delete');
            const localFile = new LocalFile(filePath);

            const result = localFile.unsafeRemove();

            expect(result).toBe(true);
            expect(existsSync(filePath)).toBe(false);
        });

        it('should not throw when file is already gone', () => {
            const localFile = new LocalFile(join(testDir, 'already-gone.txt'));
            expect(localFile.unsafeRemove()).toBe(true);
        });
    });

    describe('concurrent writes', () => {
        it('should serialize concurrent writes without data corruption or orphaned tmp files', async () => {
            const concurrentFile = join(testDir, 'concurrent.txt');
            writeFileSync(concurrentFile, 'initial');
            const localFile = new LocalFile(concurrentFile);

            const writes = Array.from({ length: 10 }, (_, i) => localFile.write(`write-${i}`));
            await Promise.all(writes);

            // The file should contain one of the written values (the last one to win the lock)
            const content = readFileSync(concurrentFile, 'utf8');
            expect(content).toMatch(/^write-\d$/);

            // No orphaned tmp files should remain
            const tmpFiles = readdirSync(testDir).filter((f: string) => f.endsWith('.tmp'));
            expect(tmpFiles).toHaveLength(0);
        });
    });
});
