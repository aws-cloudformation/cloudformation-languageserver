import { LspClient } from '../../lsp-client/LspClient';
import { StandaloneTester, OperationType } from './TesterTypes';
import { retryOperationWithPerformance } from './TesterCommon';

export class HoverTester implements StandaloneTester {
    constructor(private readonly client: LspClient) {}

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
        if (!content || content.length === 0) {
            throw new Error('Hover content is empty');
        }

        const lowerContent = content.toLowerCase();
        for (const pattern of patterns) {
            if (!lowerContent.includes(pattern.toLowerCase())) {
                throw new Error(`Hover content missing expected pattern: ${pattern}`);
            }
        }
    }

    async testAllScenarios(uri: string): Promise<void> {
        // Test 1: Hover on resource type using full document update
        const s3Template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyResource:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: TestName
`;

        await this.client.updateDocument(uri, 2, s3Template);

        await retryOperationWithPerformance(
            () => this.client.hover(uri, 3, 15),
            (result: any) => {
                if (!result?.contents) {
                    throw new Error('Hover on resource type returned no content');
                }

                const content = this.extractHoverContent(result);
                this.validateHoverContent(content, ['aws::s3::bucket', 'bucket', 's3']);
            },
            OperationType.HOVER,
        );

        // Test 2: Hover on property after adding Parameters section using incremental update
        const parametersSection = `
Parameters:
  MyParam:
    Type: String
    Default: TestValue
`;

        await this.client.updateDocument(uri, 3, [
            {
                range: { start: { line: 6, character: 0 }, end: { line: 6, character: 0 } },
                text: parametersSection,
            },
        ]);

        await retryOperationWithPerformance(
            () => this.client.hover(uri, 8, 10),
            (result: any) => {
                if (!result?.contents) {
                    throw new Error('Hover on parameter returned no content');
                }

                const content = this.extractHoverContent(result);
                this.validateHoverContent(content, ['parameter', 'string']);
            },
            OperationType.HOVER,
        );
    }
}
