import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { CfnValidateEngine } from '../../../../src/services/cfnValidate/CfnValidateEngine';

// Path deliberately does not exist on disk: the engine must read the content it is given, not the file system
const UNSAVED_TEMPLATE_PATH = '/does/not/exist/template.yaml';

const TEMPLATE_WITH_UNKNOWN_PROPERTY = [
    'AWSTemplateFormatVersion: "2010-09-09"',
    'Resources:',
    '  Bucket:',
    '    Type: AWS::S3::Bucket',
    '    Properties:',
    '      NotARealProperty: value',
    '',
].join('\n');

describe('CfnValidateEngine', () => {
    const engine = new CfnValidateEngine();

    beforeAll(async () => {
        await engine.initialize();
    });

    afterAll(() => {
        engine.close();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('validates in-memory content and reports 1-based locations for the given path', () => {
        const report = engine.validate(TEMPLATE_WITH_UNKNOWN_PROPERTY, UNSAVED_TEMPLATE_PATH, {
            severityLevel: 'WARN',
        });

        expect(report.status).toBe('OK');
        expect(report.filePath).toBe(UNSAVED_TEMPLATE_PATH);
        const unknownProperty = report.diagnostics.find((diagnostic) => diagnostic.ruleId === 'F3002');
        expect(unknownProperty).toMatchObject({ startLine: 6, startColumn: 7, entity: { logicalId: 'Bucket' } });
    });

    test('returns a report with a parse diagnostic instead of throwing for invalid syntax', () => {
        const report = engine.validate('Resources:\n  Broken\n  Type: 1\n', UNSAVED_TEMPLATE_PATH, {
            severityLevel: 'WARN',
        });

        expect(report.status).toBe('ERROR');
        expect(report.diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual(['F1101']);
    });

    test('drops findings below the requested severity level', () => {
        const warnAndAbove = engine.validate(TEMPLATE_WITH_UNKNOWN_PROPERTY, UNSAVED_TEMPLATE_PATH, {
            severityLevel: 'WARN',
        });
        const infoAndAbove = engine.validate(TEMPLATE_WITH_UNKNOWN_PROPERTY, UNSAVED_TEMPLATE_PATH, {
            severityLevel: 'INFO',
        });

        expect(warnAndAbove.diagnostics.some((diagnostic) => diagnostic.severity === 'INFO')).toBe(false);
        expect(infoAndAbove.diagnostics.some((diagnostic) => diagnostic.severity === 'INFO')).toBe(true);
    });

    test('loads the module once across repeated initialization', async () => {
        const loadModule = vi.fn(() => import('@aws/cloudformation-validate'));
        const lazyEngine = new CfnValidateEngine(loadModule);

        await lazyEngine.initialize();
        await lazyEngine.initialize();

        expect(loadModule).toHaveBeenCalledTimes(1);
        expect(lazyEngine.isInitialized()).toBe(true);
        lazyEngine.close();
    });

    test('rejects validation before initialization', () => {
        const uninitialized = new CfnValidateEngine();

        expect(() => uninitialized.validate('Resources: {}', UNSAVED_TEMPLATE_PATH, { severityLevel: 'WARN' })).toThrow(
            'CfnValidateEngine is not initialized',
        );
    });

    test('releases the engine on close and can be initialized again', async () => {
        const reusable = new CfnValidateEngine();
        await reusable.initialize();

        reusable.close();

        expect(reusable.isInitialized()).toBe(false);
        expect(() => reusable.validate('Resources: {}', UNSAVED_TEMPLATE_PATH, { severityLevel: 'WARN' })).toThrow();
        await reusable.initialize();
        expect(reusable.isInitialized()).toBe(true);
        reusable.close();
    });
});
