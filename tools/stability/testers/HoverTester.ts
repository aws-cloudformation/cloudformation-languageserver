import { LspClient } from '../../lspClient/LspClient';
import { Hover, MarkupContent } from 'vscode-languageserver-types';
import { OperationTester, OperationType } from './TesterTypes';
import { retryOperationWithPerformance, nextDocumentVersion } from './TesterUtils';

export class HoverTester implements OperationTester {
    constructor(private readonly client: LspClient) {}

    private extractHoverContent(hoverResult: Hover): string {
        const contents = hoverResult.contents;
        if (typeof contents === 'string') {
            return contents;
        } else if (Array.isArray(contents)) {
            return contents.length > 0 ? JSON.stringify(contents) : '';
        } else if ('value' in contents) {
            return (contents as MarkupContent).value;
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

        await this.client.updateDocument(uri, nextDocumentVersion(), s3Template);

        await retryOperationWithPerformance(
            () => this.client.hover(uri, 3, 15),
            (result: Hover | null) => {
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

        await this.client.updateDocument(uri, nextDocumentVersion(), [
            {
                range: { start: { line: 6, character: 0 }, end: { line: 6, character: 0 } },
                text: parametersSection,
            },
        ]);

        await retryOperationWithPerformance(
            () => this.client.hover(uri, 8, 10),
            (result: Hover | null) => {
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
