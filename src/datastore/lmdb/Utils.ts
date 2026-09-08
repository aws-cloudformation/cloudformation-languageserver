import { stableApplicationSpecificKey, stableMachineSpecificKey } from '../../utils/MachineKey';

export function encryptionStrategy(version: number): string | Buffer | undefined {
    switch (version) {
        case 7: {
            return stableApplicationSpecificKey(
                'lmdb-v7-static-salt',
                'lmdb-v7-encryption-key-derivation',
                16,
            ).toString('hex');
        }
        case 6:
        case 5:
        case 4: {
            return stableMachineSpecificKey('lmdb-static-salt', 'lmdb-encryption-key-derivation', 16).toString('hex');
        }
        default: {
            throw new Error(`Unknown LMDB version ${version}`);
        }
    }
}
