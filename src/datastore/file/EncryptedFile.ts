import { join } from 'path';
import { Logger } from 'pino';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { LocalFile } from '../../utils/LocalFile';
import { recordDiscardedData } from '../Utils';
import { decrypt, encrypt } from './Encryption';

/**
 * Encrypted on-disk envelope. Stores the original key alongside the value
 * so the key can be recovered from the file during startup.
 */
export type EncryptedEntry<T = unknown> = {
    readonly key: string;
    readonly value: T;
};

export class EncryptedFile {
    private readonly log: Logger;
    private readonly file: LocalFile;
    private key: string | undefined;
    private content: EncryptedEntry | undefined = undefined;

    constructor(
        private readonly encryptionKey: Buffer,
        storeName: string,
        fileName: string,
        fileDbDir: string,
        private readonly telemetry: ScopedTelemetry,
    ) {
        this.log = LoggerFactory.getLogger(`EncryptedFile.${storeName}`);
        this.file = new LocalFile(join(fileDbDir, fileName));

        try {
            this.content = this.readFile();
        } catch (error) {
            recordDiscardedData(this.telemetry, error);
            this.file.unsafeRemove();
        }
    }

    setKey(key: string) {
        if (this.key !== undefined) {
            throw new Error('File key was already set');
        }
        this.key = key;
    }

    exists() {
        return this.file.exists();
    }

    entry(): EncryptedEntry | undefined {
        return this.content;
    }

    get<T>(): T | undefined {
        return this.content?.value as T | undefined;
    }

    async put<T>(value: T): Promise<boolean> {
        if (this.key === undefined) {
            throw new Error('File key is not set');
        }

        this.content = { key: this.key, value };
        return await this.file.write(encrypt(this.encryptionKey, JSON.stringify(this.content)));
    }

    async remove() {
        this.content = undefined;
        return await this.file.remove();
    }

    fileSize(): number {
        return this.file.fileBytes();
    }

    private readFile(): EncryptedEntry | undefined {
        const contents = this.file.readBytes();
        if (contents !== undefined) {
            return JSON.parse(decrypt(this.encryptionKey, contents)) as EncryptedEntry;
        }

        return;
    }
}
