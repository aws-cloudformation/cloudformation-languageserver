/* eslint-disable vitest/no-standalone-expect */
import { expect } from 'vitest';
import { CompletionTriggerKind } from 'vscode-languageserver-protocol';
import { DocumentHelper } from '../../utils/DocumentHelper';
import { TestExtension } from '../../utils/TestExtension';
import { executeWithRetry } from '../LongRunningLspClient';
import { TesterConfig } from '../LongRunningTypes';

export class CompletionTester {
    constructor(
        private readonly testExtension: TestExtension,
        private readonly config: TesterConfig,
    ) {}

    async testAllScenarios(uri: string): Promise<void> {
        // Test 1: Full document replacement
        const version1 = Date.now();
        await DocumentHelper.replaceDocumentContent(
            this.testExtension,
            uri,
            version1,
            `AWSTemplateFormatVersion: '2010-09-09'\n`,
        );

        const result1: any = await executeWithRetry(
            () =>
                this.testExtension.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 0 },
                    context: { triggerKind: CompletionTriggerKind.Invoked },
                }),
            'completion',
            this.config.maxRetries,
            this.config.responseTimeout,
        );

        expect(result1).toBeDefined();
        expect(result1?.items).toBeDefined();
        expect(Array.isArray(result1.items)).toBe(true);
        expect(result1.items.length).toBeGreaterThan(0);

        const topLevelLabels = result1.items.map((item: any) => item.label);
        expect(topLevelLabels).toContain('Resources');
        expect(topLevelLabels).toContain('Parameters');

        // Test 2: Incremental update - add Resources section
        await DocumentHelper.appendDocumentContent(
            this.testExtension,
            uri,
            version1 + 1,
            1,
            `Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket\n    Properties:\n`,
            ['Resources:', 'MyBucket:', 'AWS::S3::Bucket', 'Properties:'],
        );

        const result2: any = await executeWithRetry(
            () =>
                this.testExtension.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 6 },
                    context: { triggerKind: CompletionTriggerKind.Invoked },
                }),
            'completion',
            this.config.maxRetries,
            this.config.responseTimeout,
        );

        expect(result2).toBeDefined();
        expect(result2?.items).toBeDefined();
        expect(Array.isArray(result2.items)).toBe(true);
        expect(result2.items.length).toBeGreaterThan(0);

        const propertyLabels = result2.items.map((item: any) => item.label);
        expect(propertyLabels).toContain('BucketName');
        expect(propertyLabels).toContain('Tags');
    }
}
