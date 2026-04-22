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

            // Wait for guard diagnostics after adding a resource type
            await WaitFor.waitFor(() => {
                const diags = client.receivedDiagnostics;
                const latest = diags[diags.length - 1];
                if (latest?.uri !== uri || latest.diagnostics.length === 0) {
                    throw new Error('No diagnostics received yet for typed resource');
                }
            }, 5000);

            const latest = client.receivedDiagnostics[client.receivedDiagnostics.length - 1];
            expect(latest.uri).toBe(uri);
            expect(latest.diagnostics.length).toBeGreaterThan(0);

            const guardDiags = latest.diagnostics.filter((d: any) => d.source === 'cfn-guard');
            expect(guardDiags.length).toBeGreaterThan(0);

            await client.closeDocument({ textDocument: { uri } });
        });

        it('should receive diagnostics for public access violations', async () => {
            // Create bucket with public access explicitly disabled
            const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: public-bucket
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false`;

            const uri = await client.openYamlTemplate(template);

            // Wait for guard diagnostics about public access
            await WaitFor.waitFor(() => {
                const diags = client.receivedDiagnostics;
                const latest = diags[diags.length - 1];
                if (latest?.uri !== uri || latest.diagnostics.length === 0) {
                    throw new Error('No diagnostics received yet');
                }
            }, 5000);

            const latest = client.receivedDiagnostics[client.receivedDiagnostics.length - 1];
            expect(latest.uri).toBe(uri);

            const guardDiags = latest.diagnostics.filter((d: any) => d.source === 'cfn-guard');
            expect(guardDiags.length).toBeGreaterThan(0);

            // Should flag the public access configuration
            const publicAccessDiag = guardDiags.find((d: any) => /PublicAccessBlock|public/i.test(d.message));
            expect(publicAccessDiag).toBeDefined();

            await client.closeDocument({ textDocument: { uri } });
        });

        it('should clear diagnostics when document is closed', async () => {
            const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`;

            const uri = await client.openYamlTemplate(template);

            // Wait for diagnostics to arrive
            await WaitFor.waitFor(() => {
                const latest = client.receivedDiagnostics[client.receivedDiagnostics.length - 1];
                if (latest?.uri !== uri || latest.diagnostics.length === 0) {
                    throw new Error('No diagnostics received yet');
                }
            }, 5000);

            // Close the document
            await client.closeDocument({ textDocument: { uri } });

            // Wait for empty diagnostics to be published for the closed URI
            await WaitFor.waitFor(() => {
                const clearEvent = client.receivedDiagnostics.find(
                    (d: any) => d.uri === uri && d.diagnostics.length === 0,
                );
                if (!clearEvent) {
                    throw new Error('Diagnostics not cleared after close');
                }
            }, 5000);

            const clearEvent = client.receivedDiagnostics.find((d: any) => d.uri === uri && d.diagnostics.length === 0);
            expect(clearEvent).toBeDefined();
            expect(clearEvent.diagnostics).toHaveLength(0);
        });
    });
});
