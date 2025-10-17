import { stableMachineSpecificKey } from '../../utils/MachineKey';

export function encryptionStrategy(version: string): string | Buffer | undefined {
    switch (version) {
        case 'v2': {
            return stableMachineSpecificKey('lmdb-static-salt', 'lmdb-encryption-key-derivation', 16).toString('hex');
        }
        case 'v1': {
            return undefined;
        }
        default: {
            throw new Error(`Unknown LMDB version ${version}`);
        }
    }
}
