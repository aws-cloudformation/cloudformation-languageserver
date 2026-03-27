/* eslint-disable vitest/no-standalone-expect */
import { expect } from 'vitest';
import { DocumentHelper } from '../../utils/DocumentHelper';
import { TestExtension } from '../../utils/TestExtension';
import { TesterConfig } from '../LongRunningTypes';
import { Tester, executeWithRetry } from './TesterCommon';

export class HoverTester implements Tester {
    constructor(
        private readonly testExtension: TestExtension,
        private readonly config: TesterConfig,
    ) {}

    private extractHoverContent(hoverResult: any): string {
        if (typeof hoverResult.contents === 'string') {
            return hoverResult.contents;
        } else if (Array.isArray(hoverResult.contents)) {
            return hoverResult.contents.length > 0 ? JSON.stringify(hoverResult.contents) : '';
        } else if (
            hoverResult.contents &&
            typeof hoverResult.contents === 'object' &&
            'value' in hoverResult.contents
        ) {
            return hoverResult.contents.value;
        }
        return '';
    }

    private validateHoverContent(content: string, patterns: string[]): void {
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);
        const lowerContent = content.toLowerCase();
        for (const pattern of patterns) expect(lowerContent).toContain(pattern);
    }

    async testAllScenarios(uri: string): Promise<void> {
        // Test 1: Full document replacement
        const version1 = Date.now();
        const s3Template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyResource:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: TestName
`;

        await DocumentHelper.replaceDocumentContent(this.testExtension, uri, version1, s3Template);

        const result1: any = await executeWithRetry(
            () =>
                this.testExtension.hover({
                    textDocument: { uri },
                    position: { line: 3, character: 15 },
                }),
            'hover',
            this.config,
        );

        expect(result1).toBeDefined();
        expect(result1.contents).toBeDefined();
        const content1 = this.extractHoverContent(result1);
        this.validateHoverContent(content1, ['aws::s3::bucket', 'bucket', 's3', 'aws']);

        // Test 2: Incremental update - add Parameters section
        await DocumentHelper.appendDocumentContent(
            this.testExtension,
            uri,
            version1 + 1,
            6,
            `
Parameters:
  MyParam:
    Type: String
`,
            ['Parameters:', 'MyParam:'],
        );

        const result2: any = await executeWithRetry(
            () =>
                this.testExtension.hover({
                    textDocument: { uri },
                    position: { line: 9, character: 10 },
                }),
            'hover',
            this.config,
        );

        expect(result2).toBeDefined();
        expect(result2.contents).toBeDefined();
        const content2 = this.extractHoverContent(result2);
        this.validateHoverContent(content2, ['type', 'parameter', 'string']);
    }
}
