import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const CFN_CLIENT_PATH = join(homedir(), 'Downloads', 'client-cloudformation');

export function localCfnClientExists(): boolean {
    return existsSync(CFN_CLIENT_PATH);
}
