import { hkdfSync } from 'crypto';
import { homedir, platform, arch, hostname, cpus } from 'os';
import { ExtensionName } from './ExtensionConfig';

export function stableMachineSpecificKey(salt: string, info: string, keyLen: number = 255): Buffer {
    // Collect CPU model information, joining all CPU models with hyphens
    const cpuModel =
        cpus().length > 0
            ? cpus()
                  .map((cpu) => cpu.model)
                  .sort()
                  .join('-')
                  .trim()
            : 'unknown-cpu';

    const fingerprintString = [ExtensionName, platform(), arch(), hostname(), homedir(), cpuModel]
        .join('-')
        .replaceAll(/[^a-zA-Z0-9]/g, '');

    const derivedKey = hkdfSync('sha512', fingerprintString, salt, info, keyLen);
    if (Buffer.isBuffer(derivedKey)) {
        return derivedKey;
    } else {
        return Buffer.from(derivedKey);
    }
}
