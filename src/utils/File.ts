import { readFileSync, existsSync, PathLike } from 'fs'; // eslint-disable-line no-restricted-imports
import { readFile, rename, unlink, open } from 'fs/promises'; // eslint-disable-line no-restricted-imports
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { isWindows } from './Environment';
import { DoesNotExist } from './Errors';
import { sleep } from './Retry';
import { toString } from './String';

const log = LoggerFactory.getLogger('File');

type Options =
    | BufferEncoding
    | {
          encoding: BufferEncoding;
          flag?: string | undefined;
      };

export function readFileIfExists(path: PathLike, options: Options = 'utf8'): string {
    try {
        if (existsSync(path)) {
            return readFileSync(path, options);
        } else {
            throw new DoesNotExist(toString(path));
        }
    } catch (err) {
        log.error(err);
        throw err;
    }
}

export async function readFileIfExistsAsync(path: PathLike, options: Options = 'utf8'): Promise<string> {
    try {
        if (existsSync(path)) {
            return await readFile(path, options);
        } else {
            throw new DoesNotExist(toString(path));
        }
    } catch (err) {
        log.error(err);
        throw err;
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
        if (existsSync(path)) {
            return readFileSync(path, options);
        } else {
            throw new DoesNotExist(toString(path));
        }
    } catch (err) {
        log.error(err);
        throw err;
    }
}

export function readBufferIfExistsAsync(
    path: PathLike,
    options?: {
        encoding?: null | undefined;
        flag?: string | undefined;
    } | null,
): Promise<Buffer> {
    try {
        if (existsSync(path)) {
            return readFile(path, options);
        } else {
            throw new DoesNotExist(toString(path));
        }
    } catch (err) {
        log.error(err);
        throw err;
    }
}

const RETRIABLE_RENAME_CODES = new Set(['EPERM', 'EACCES', 'EBUSY', 'ENOENT']);

export async function asyncRenameWithRetry(
    sourcePath: string,
    destinationPath: string,
    maxRetries = 10,
    retryDelayMs = 50,
): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await rename(sourcePath, destinationPath);
            return;
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (!code || !RETRIABLE_RENAME_CODES.has(code) || attempt === maxRetries - 1) {
                try {
                    await unlink(sourcePath);
                } catch (err) {
                    // best-effort tmp cleanup
                    log.error(err);
                }
                throw error;
            }
            await sleep(retryDelayMs);
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
    // File was deleted by another process (e.g. a concurrent IDE session sharing the same storage directory)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-explicit-any
    return (error as any).code === 'ENOENT';
}
