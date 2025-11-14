import { existsSync } from 'fs';
import { createRequire } from 'module';
import { join, resolve } from 'path';
import { readFileIfExists } from './File';

/* eslint-disable unicorn/no-static-only-class, security/detect-non-literal-require */
export class DynamicModuleLoader {
    static load<T = unknown>(modulePath: string): T | undefined {
        const resolvedPath = resolve(modulePath);

        if (!existsSync(resolvedPath)) {
            return undefined;
        }

        let targetPath = resolvedPath;
        if (existsSync(join(resolvedPath, 'package.json'))) {
            const pkg = JSON.parse(readFileIfExists(join(resolvedPath, 'package.json'), 'utf8')) as Record<
                string,
                unknown
            >;
            targetPath = join(resolvedPath, pkg['main'] as string);
        }

        const require = createRequire(__filename);
        return require(targetPath) as T;
    }
}
