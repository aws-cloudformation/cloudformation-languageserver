import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { FeatureFlagConfigSchema } from '../../../src/featureFlag/FeatureFlagBuilder';

describe('FeatureFlagProvider', () => {
    it('can parse feature flags', () => {
        [
            join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'alpha.json'),
            join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'beta.json'),
            join(__dirname, '..', '..', '..', 'assets', 'featureFlag', 'prod.json'),
        ].map((path) => {
            const file = readFileSync(path, 'utf8');
            expect(file).toBeDefined();
            expect(FeatureFlagConfigSchema.parse(JSON.parse(file))).toBeDefined();
        });
    });
});
