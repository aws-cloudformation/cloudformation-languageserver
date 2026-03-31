import { LspClient } from '../../lsp-client/LspClient';
import { StandaloneTester, OperationType } from './TesterTypes';
import { retryOperationWithPerformance } from './TesterCommon';

export class CompletionTester implements StandaloneTester {
    constructor(private readonly client: LspClient) {}

    private validateCompletionItems(result: any, requiredLabels: string[], context: string): void {
        if (!result?.items || !Array.isArray(result.items) || result.items.length === 0) {
            throw new Error(`${context} returned no items`);
        }

        const labels = new Set(result.items.map((item: any) => item.label as string));
        for (const required of requiredLabels) {
            if (!labels.has(required)) {
                throw new Error(`${context} missing ${required}`);
            }
        }
    }

    async testAllScenarios(uri: string): Promise<void> {
        // Test 1: Top-level completion using full document update
        const basicTemplate = `AWSTemplateFormatVersion: '2010-09-09'
`;

        await this.client.updateDocument(uri, 4, basicTemplate);

        await retryOperationWithPerformance(
            () => this.client.completion(uri, 1, 0),
            (result: any) => this.validateCompletionItems(result, ['Resources', 'Parameters'], 'Top-level completion'),
            OperationType.COMPLETION,
        );

        // Test 2: Property completion in Resources using incremental update
        const resourceSection = `
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      `;

        await this.client.updateDocument(uri, 5, [
            {
                range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
                text: resourceSection,
            },
        ]);

        await retryOperationWithPerformance(
            () => this.client.completion(uri, 6, 6),
            (result: any) => this.validateCompletionItems(result, ['BucketName', 'Tags'], 'S3 bucket completion'),
            OperationType.COMPLETION,
        );
    }
}
