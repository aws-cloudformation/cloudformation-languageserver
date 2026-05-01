import { randomUUID as v4 } from 'crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { describe, it, expect, afterAll, afterEach, vi } from 'vitest';
import { LocalFile } from '../../../src/utils/LocalFile';

vi.mock('fs/promises', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs/promises')>();
    return { ...actual, writeFile: vi.fn(actual.writeFile) };
});

describe('LocalFile write failure cleanup', () => {
    const testDir = join(process.cwd(), 'node_modules', '.cache', 'localfile-write-failure', v4());
    const filePath = join(testDir, 'test-file.txt');
    const mockedWriteFile = vi.mocked(writeFile);

    afterEach(() => {
        mockedWriteFile.mockRestore();
    });

    afterAll(() => {
        rmSync(testDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('should clean up temp file and leave original untouched when writeFile fails', async () => {
        mkdirSync(testDir, { recursive: true });
        writeFileSync(filePath, 'original');
        const localFile = new LocalFile(filePath);

        mockedWriteFile.mockRejectedValueOnce(new Error('disk full'));

        await expect(localFile.write('new-content')).rejects.toThrow('disk full');

        // Original file should be untouched
        expect(readFileSync(filePath, 'utf8')).toBe('original');

        // No orphaned tmp files
        const tmpFiles = readdirSync(testDir).filter((f: string) => f.endsWith('.tmp'));
        expect(tmpFiles).toHaveLength(0);
    });
});
