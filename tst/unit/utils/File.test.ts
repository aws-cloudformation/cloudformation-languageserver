import { randomUUID as v4 } from 'crypto';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileIfExists, readFileIfExistsAsync, readBufferIfExists } from '../../../src/utils/File';

describe('File', () => {
    const testDir = join(process.cwd(), 'node_modules', '.cache', 'file-tests', v4());
    const textFile = join(testDir, 'text.txt');
    const binaryFile = join(testDir, 'binary.bin');
    const textContent = 'hello world 🌍';
    const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    const nonexistentPath = join(testDir, 'does-not-exist.txt');

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
});
