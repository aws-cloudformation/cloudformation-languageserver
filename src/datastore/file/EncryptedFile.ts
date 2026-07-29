import { join } from 'path';
import { LocalFile } from '../../utils/LocalFile';
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
    private key: string | undefined;
    private content: EncryptedEntry | undefined = undefined;

    constructor(
        private readonly encryptionKey: Buffer,
        private readonly file: LocalFile,
    ) {
        this.content = this.readFile();
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
        const removed = await this.file.remove();
        this.content = undefined;
        return removed;
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

    static createFromPath(encryptionKey: Buffer, fileName: string, fileDir: string) {
        return new EncryptedFile(encryptionKey, new LocalFile(join(fileDir, fileName)));
    }
}
