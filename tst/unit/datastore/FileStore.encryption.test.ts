import { randomBytes } from 'crypto';
import { describe, it, expect } from 'vitest';
import { decrypt, encrypt, encryptionKey } from '../../../src/datastore/file/Encryption';

describe('Encryption', () => {
    const key = encryptionKey(3);

    describe('encrypt and decrypt', () => {
        it('should round-trip a simple string', () => {
            const plaintext = 'hello world';
            const encrypted = encrypt(key, plaintext);
            expect(decrypt(key, encrypted)).toBe(plaintext);
        });

        it('should round-trip JSON with unicode', () => {
            const data = JSON.stringify({ region: 'us-east-1', emoji: '🔑', tags: ['α', 'β'] });
            const encrypted = encrypt(key, data);
            expect(decrypt(key, encrypted)).toBe(data);
        });

        it('should round-trip an empty string', () => {
            const encrypted = encrypt(key, '');
            expect(decrypt(key, encrypted)).toBe('');
        });

        it('should round-trip large payloads', () => {
            const data = 'x'.repeat(1_000_000);
            const encrypted = encrypt(key, data);
            expect(decrypt(key, encrypted)).toBe(data);
        });

        it('should produce different ciphertext for the same plaintext', () => {
            const plaintext = 'deterministic?';
            const a = encrypt(key, plaintext);
            const b = encrypt(key, plaintext);
            expect(a.equals(b)).toBe(false);
            expect(decrypt(key, a)).toBe(plaintext);
            expect(decrypt(key, b)).toBe(plaintext);
        });

        it('should not contain plaintext in the ciphertext', () => {
            const secret = 'super-secret-password-12345';
            const encrypted = encrypt(key, secret);
            expect(encrypted.toString('utf8')).not.toContain(secret);
        });
    });

    describe('tamper detection', () => {
        it('should reject decryption with a wrong key', () => {
            const encrypted = encrypt(key, 'data');
            const wrongKey = randomBytes(32);
            expect(() => decrypt(wrongKey, encrypted)).toThrow();
        });

        it('should reject a flipped byte in the ciphertext payload', () => {
            const encrypted = encrypt(key, 'integrity check');
            const tampered = Buffer.from(encrypted);
            // Flip a byte in the encrypted payload area (after IV + auth tag = 28 bytes)
            tampered[28] ^= 0xff;
            expect(() => decrypt(key, tampered)).toThrow();
        });

        it('should reject a modified auth tag', () => {
            const encrypted = encrypt(key, 'auth tag check');
            const tampered = Buffer.from(encrypted);
            // Auth tag starts at byte 12
            tampered[12] ^= 0xff;
            expect(() => decrypt(key, tampered)).toThrow();
        });

        it('should reject a modified IV', () => {
            const encrypted = encrypt(key, 'iv check');
            const tampered = Buffer.from(encrypted);
            tampered[0] ^= 0xff;
            expect(() => decrypt(key, tampered)).toThrow();
        });

        it('should reject truncated data', () => {
            const encrypted = encrypt(key, 'truncation check');
            expect(() => decrypt(key, encrypted.subarray(0, 10))).toThrow();
        });
    });

    describe('encryptionKey', () => {
        it('should return the same key for versions 1, 2, and 3', () => {
            const k1 = encryptionKey(1);
            const k2 = encryptionKey(2);
            const k3 = encryptionKey(3);
            expect(k1.equals(k2)).toBe(true);
            expect(k2.equals(k3)).toBe(true);
        });

        it('should return a 32-byte key', () => {
            expect(encryptionKey(3)).toHaveLength(32);
        });

        it('should throw for unknown versions', () => {
            expect(() => encryptionKey(0)).toThrow('Unknown FileDB version 0');
            expect(() => encryptionKey(99)).toThrow('Unknown FileDB version 99');
        });

        it('should return deterministic keys across calls', () => {
            expect(encryptionKey(3).equals(encryptionKey(3))).toBe(true);
        });
    });
});
