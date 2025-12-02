import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { stableMachineSpecificKey } from '../../utils/MachineKey';

export function encryptionKey(version: number): Buffer {
    switch (version) {
        case 2:
        case 1: {
            return stableMachineSpecificKey('filedb-static-salt', 'filedb-encryption-key-derivation', 32);
        }
        default: {
            throw new Error(`Unknown FileDB version ${version}`);
        }
    }
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard: 12 bytes (96 bits)
const AUTH_TAG_LENGTH = 16; // GCM standard: 16 bytes (128 bits)

export function encrypt(KEY: Buffer, data: string): Buffer {
    // 1. Generate a unique IV for this encryption
    const iv = randomBytes(IV_LENGTH);

    // 2. Create the GCM cipher
    const cipher = createCipheriv(ALGORITHM, KEY, iv);

    // 3. Encrypt the data
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);

    // 4. Get the Authentication Tag (verifies integrity)
    const authTag = cipher.getAuthTag();

    // 5. Assemble the final buffer
    // We allocate one buffer and copy data in, which is faster than Buffer.concat
    const totalLength = IV_LENGTH + AUTH_TAG_LENGTH + encrypted.length;
    const result = Buffer.allocUnsafe(totalLength);

    iv.copy(result, 0); // Copy IV to the beginning
    authTag.copy(result, IV_LENGTH); // Copy AuthTag after IV
    encrypted.copy(result, IV_LENGTH + AUTH_TAG_LENGTH); // Copy payload after AuthTag

    return result;
}

export function decrypt(KEY: Buffer, data: Buffer) {
    // 1. Extract components from the buffer
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedContent = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // 2. Create the GCM decipher
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);

    // 3. Set the Auth Tag (this is for integrity checking)
    decipher.setAuthTag(authTag);

    // 4. Decrypt and return
    // If the data was tampered with, decipher.final() will throw an error.

    // Get both parts as buffers
    const part1 = decipher.update(encryptedContent);
    const part2 = decipher.final(); // Get the final part as a buffer

    return Buffer.concat([part1, part2]).toString('utf8');
}
