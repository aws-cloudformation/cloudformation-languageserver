import os from 'os';
import { basename, resolve } from 'path';

export class SensitiveInfo {
    private static ComputedOnce = false;
    private static ComputedSuccessfully = false;
    private static readonly BaseDir = basename(resolve(__dirname));
    private static Info: string[] = [];

    static didComputeSuccessfully() {
        if (!this.ComputedOnce) {
            this.getSensitiveInfo();
        }
        return this.ComputedSuccessfully;
    }

    private static getSensitiveInfo() {
        if (this.ComputedOnce) {
            return this.Info;
        }

        this.ComputedOnce = true;
        try {
            const UserInfo = os.userInfo();
            this.Info = [
                UserInfo.username,
                `${UserInfo.uid}`,
                `${UserInfo.gid}`,
                UserInfo.shell,
                UserInfo.homedir,
                resolve(__dirname),
            ]
                .filter((v): v is string => typeof v === 'string' && v.length > 0)
                .sort((a, b) => b.length - a.length);

            SensitiveInfo.ComputedSuccessfully = true;
        } catch {
            // do nothing
        }

        return this.Info;
    }

    static sanitizePath(path: string): string {
        let sanitized = path;

        // Strip sensitive info first
        for (const info of this.getSensitiveInfo()) {
            sanitized = sanitized.replaceAll(info, 'REDACTED');
        }

        // Normalize path separators for consistent processing
        const normalized = sanitized.replaceAll('\\', '/');

        // Strip cloudformation-languageserver prefix
        for (const partial of ['cloudformation-languageserver', this.BaseDir]) {
            const idx = normalized.indexOf(partial);
            if (idx !== -1) {
                return '/' + normalized.slice(idx + partial.length + 1);
            }
        }

        // Restore original separators if no prefix found
        return sanitized;
    }
}
