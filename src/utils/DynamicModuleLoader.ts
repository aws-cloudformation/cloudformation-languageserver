/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { join, resolve } from 'path';

/* eslint-disable unicorn/no-static-only-class, security/detect-non-literal-require */
export class DynamicModuleLoader {
    static load<T = unknown>(modulePath: string): T | undefined {
        const resolvedPath = resolve(modulePath);

        if (!existsSync(resolvedPath)) {
            return undefined;
        }

        let targetPath = resolvedPath;
        if (existsSync(join(resolvedPath, 'package.json'))) {
            const pkg = JSON.parse(readFileSync(join(resolvedPath, 'package.json'), 'utf8')) as Record<string, unknown>;
            targetPath = join(resolvedPath, pkg['main'] as string);
        }

        const require = createRequire(__filename);
        return require(targetPath) as T;
    }
}
