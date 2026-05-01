import { readFileSync, PathLike } from 'fs'; // eslint-disable-line no-restricted-imports
import { readFile, rename, unlink, open } from 'fs/promises'; // eslint-disable-line no-restricted-imports
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { isWindows } from './Environment';
import { DoesNotExist } from './Errors';
import { calculateDelay, sleep } from './Retry';
import { toString } from './String';

const log = LoggerFactory.getLogger('File');

type Options =
    | BufferEncoding
    | {
          encoding: BufferEncoding;
          flag?: string | undefined;
      };

const ENOENT = 'ENOENT'; // No such file or directory
const RETRIABLE_RENAME_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);

function wrapReadEnoentError(path: PathLike, err: unknown): never {
    log.error(err);
    if (isFileNotFoundError(err)) {
        throw new DoesNotExist(toString(path));
    }

    throw err;
}

export function readFileIfExists(path: PathLike, options: Options = 'utf8'): string {
    try {
        return readFileSync(path, options);
    } catch (err) {
        wrapReadEnoentError(path, err);
    }
}

export async function readFileIfExistsAsync(path: PathLike, options: Options = 'utf8'): Promise<string> {
    try {
        return await readFile(path, options);
    } catch (err) {
        wrapReadEnoentError(path, err);
    }
}

export function readBufferIfExists(
    path: PathLike,
    options?: {
        encoding?: null | undefined;
        flag?: string | undefined;
    } | null,
): Buffer {
    try {
        return readFileSync(path, options);
    } catch (err) {
        wrapReadEnoentError(path, err);
    }
}

export async function readBufferIfExistsAsync(
    path: PathLike,
    options?: {
        encoding?: null | undefined;
        flag?: string | undefined;
    } | null,
): Promise<Buffer> {
    try {
        return await readFile(path, options);
    } catch (err) {
        wrapReadEnoentError(path, err);
    }
}

export async function asyncRenameWithRetry(
    sourcePath: string,
    destinationPath: string,
    maxRetries = 10,
    initialDelayMs = 50,
): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await rename(sourcePath, destinationPath);
            return;
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (!code || !RETRIABLE_RENAME_CODES.has(code) || attempt === maxRetries - 1) {
                try {
                    if (!isFileNotFoundError(error)) {
                        await unlink(sourcePath);
                    }
                } catch (err) {
                    log.error(err, `Best effort tmp cleanup failed for ${sourcePath}`);
                }
                throw error;
            }
            await sleep(calculateDelay(attempt, initialDelayMs));
        }
    }
}

export async function asyncFileSync(filePath: string): Promise<void> {
    const handle = await open(filePath, 'r+');
    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}

export async function asyncDirSync(dirPath: string): Promise<void> {
    try {
        const handle = await open(dirPath, 'r');
        try {
            await handle.sync();
        } finally {
            await handle.close();
        }
    } catch (err) {
        // Windows cannot fsync directories
        if (!isWindows) {
            log.error(err);
        }
    }
}

export function isFileNotFoundError(error: unknown): boolean {
    return error !== null && typeof error === 'object' && (error as NodeJS.ErrnoException).code === ENOENT;
}
