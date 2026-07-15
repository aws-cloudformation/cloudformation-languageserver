import { LspClient } from '../../lspClient/LspClient';
import { CompletionItem, CompletionList } from 'vscode-languageserver-types';
import { OperationTester, OperationType } from './TesterTypes';
import { retryOperationWithPerformance, nextDocumentVersion } from './TesterUtils';

export class CompletionTester implements OperationTester {
    constructor(private readonly client: LspClient) {}

    private validateCompletionItems(
        result: CompletionList | CompletionItem[] | null,
        requiredLabels: string[],
        context: string,
    ): void {
        const items: CompletionItem[] = Array.isArray(result) ? result : (result?.items ?? []);
        if (items.length === 0) {
            throw new Error(`${context} returned no items`);
        }

        const labels = new Set(items.map((item: CompletionItem) => item.label));
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

        await this.client.updateDocument(uri, nextDocumentVersion(), basicTemplate);

        await retryOperationWithPerformance(
            () => this.client.completion(uri, 1, 0),
            (result: CompletionList | CompletionItem[] | null) =>
                this.validateCompletionItems(result, ['Resources', 'Parameters'], 'Top-level completion'),
            OperationType.COMPLETION,
        );

        // Test 2: Property completion in Resources using incremental update
        const resourceSection = `
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      `;

        await this.client.updateDocument(uri, nextDocumentVersion(), [
            {
                range: { start: { line: 1, character: 0 }, end: { line: 1, character: 0 } },
                text: resourceSection,
            },
        ]);

        await retryOperationWithPerformance(
            () => this.client.completion(uri, 6, 6),
            (result: CompletionList | CompletionItem[] | null) =>
                this.validateCompletionItems(result, ['BucketName', 'Tags'], 'S3 bucket completion'),
            OperationType.COMPLETION,
        );
    }
}
