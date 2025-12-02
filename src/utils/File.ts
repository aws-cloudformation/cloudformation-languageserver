import { readFileSync, existsSync, PathLike } from 'fs'; // eslint-disable-line no-restricted-imports
import { readFile } from 'fs/promises'; // eslint-disable-line no-restricted-imports
import { LoggerFactory } from '../telemetry/LoggerFactory';
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
            throw new Error(`Path ${toString(path)} does not exist`);
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
            throw new Error(`Path ${toString(path)} does not exist`);
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
): NonSharedBuffer {
    try {
        if (existsSync(path)) {
            return readFileSync(path, options);
        } else {
            throw new Error(`Path ${toString(path)} does not exist`);
        }
    } catch (err) {
        log.error(err);
        throw err;
    }
}
