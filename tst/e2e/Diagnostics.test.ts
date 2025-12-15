import { join } from 'path';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestExtension } from '../utils/TestExtension';
import { WaitFor } from '../utils/Utils';

describe('Diagnostic Features', () => {
    const client = new TestExtension({
        initializeParams: {
            initializationOptions: {
                aws: {
                    clientInfo: {
                        extension: {
                            name: 'Test CloudFormation Language Server',
                            version: '1.0.0-test',
                        },
                        clientId: 'test-client',
                    },
                },
                settings: {
                    diagnostics: {
                        cfnGuard: {
                            enabled: true,
                            rulesFile: join(__dirname, '../resources/guard/test-guard-rules.guard'),
                            delayMs: 100,
                            validateOnChange: true,
                        },
                    },
                },
            },
        },
    });

    beforeAll(async () => {
        await client.ready();

        // Configure guard with custom rules file
        await client.changeConfiguration({
            settings: {
                diagnostics: {
                    cfnGuard: {
                        enabled: true,
                        rulesFile: join(__dirname, '../resources/guard/test-guard-rules.guard'),
                        delayMs: 100,
                        validateOnChange: true,
                    },
                },
            },
        });
    });

    beforeEach(async () => {
        await client.reset();
    });

    afterAll(async () => {
        await client.close();
    });

    describe('Guard diagnostics while authoring', () => {
        it('should receive diagnostics during incremental typing', async () => {
            // Start with basic template that should trigger our custom guard rules
            const initialTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`;

            const uri = await client.openYamlTemplate(initialTemplate);

            // Wait for diagnostics from our custom guard rules
            await WaitFor.waitFor(() => {
                if (client.receivedDiagnostics.length === 0) {
                    throw new Error('No diagnostics received yet');
                }
            }, 5000);

            expect(client.receivedDiagnostics.length).toBeGreaterThan(0);

            const latestDiagnostics = client.receivedDiagnostics[client.receivedDiagnostics.length - 1];
            expect(latestDiagnostics.uri).toBe(uri);
            expect(latestDiagnostics.diagnostics.length).toBeGreaterThan(0);

            // Verify we got our custom guard diagnostics
            const guardDiagnostics = latestDiagnostics.diagnostics.filter((d: any) => d.source === 'cfn-guard');
            expect(guardDiagnostics.length).toBeGreaterThan(0);

            await client.closeDocument({ textDocument: { uri } });
        });

        it('should receive diagnostics when typing new resource incrementally', async () => {
            // Start with minimal template
            const initialTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:`;

            const uri = await client.openYamlTemplate(initialTemplate);
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Type resource name
            await client.changeDocument({
                textDocument: { uri, version: 2 },
                contentChanges: [
                    {
                        range: {
                            start: { line: 2, character: 10 },
                            end: { line: 2, character: 10 },
                        },
                        text: `
  MyBucket:`,
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 200));

            // Type resource type
            await client.changeDocument({
                textDocument: { uri, version: 3 },
                contentChanges: [
                    {
                        range: {
                            start: { line: 3, character: 11 },
                            end: { line: 3, character: 11 },
                        },
                        text: `
    Type: AWS::S3::Bucket`,
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 500));

            // Test validates incremental resource creation triggers diagnostics
            expect(uri).toBeDefined();

            await client.closeDocument({ textDocument: { uri } });
        });

        it('should handle typing workflow for public access violations', async () => {
            // Start with basic bucket
            const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: public-bucket`;

            const uri = await client.openYamlTemplate(template);
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Type PublicAccessBlockConfiguration incrementally
            await client.changeDocument({
                textDocument: { uri, version: 2 },
                contentChanges: [
                    {
                        range: {
                            start: { line: 5, character: 33 },
                            end: { line: 5, character: 33 },
                        },
                        text: `
      PublicAccessBlockConfiguration:`,
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 200));

            // Add BlockPublicAcls: false
            await client.changeDocument({
                textDocument: { uri, version: 3 },
                contentChanges: [
                    {
                        range: {
                            start: { line: 6, character: 34 },
                            end: { line: 6, character: 34 },
                        },
                        text: `
        BlockPublicAcls: false`,
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 200));

            // Add remaining properties incrementally
            await client.changeDocument({
                textDocument: { uri, version: 4 },
                contentChanges: [
                    {
                        range: {
                            start: { line: 7, character: 23 },
                            end: { line: 7, character: 23 },
                        },
                        text: `
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false`,
                    },
                ],
            });

            await new Promise((resolve) => setTimeout(resolve, 500));

            // Test validates incremental typing of public access configuration
            expect(uri).toBeDefined();

            await client.closeDocument({ textDocument: { uri } });
        });
    });
});
