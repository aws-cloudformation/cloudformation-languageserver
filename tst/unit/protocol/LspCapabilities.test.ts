import { describe, it, expect } from 'vitest';
import { TextDocumentSyncKind, CodeActionKind } from 'vscode-languageserver';
import {
    DESCRIBE_TEMPLATE,
    OPTIMIZE_TEMPLATE,
    CLEAR_DIAGNOSTIC,
    GENERATE_TEMPLATE,
    ANALYZE_DIAGNOSTIC,
} from '../../../src/handlers/ExecutionHandler';
import { LspCapabilities } from '../../../src/protocol/LspCapabilities';
import { ExtensionName, ExtensionVersion } from '../../../src/utils/ExtensionConfig';

describe('LspCapabilities', () => {
    describe('capabilities structure', () => {
        it('should have correct text document sync settings', () => {
            const textDocSync = LspCapabilities.capabilities.textDocumentSync;

            expect(textDocSync).toBeDefined();
            if (typeof textDocSync === 'object' && textDocSync !== null) {
                expect((textDocSync as any).openClose).toBe(true);
                expect((textDocSync as any).change).toBe(TextDocumentSyncKind.Incremental);
                expect((textDocSync as any).save).toEqual({
                    includeText: true,
                });
            }
        });

        it('should enable hover provider', () => {
            expect(LspCapabilities.capabilities.hoverProvider).toBe(true);
        });

        it('should configure code action provider', () => {
            const codeActionProvider = LspCapabilities.capabilities.codeActionProvider;

            expect(codeActionProvider).toBeDefined();
            if (typeof codeActionProvider === 'object' && codeActionProvider !== null) {
                expect((codeActionProvider as any).resolveProvider).toBe(false);
                expect((codeActionProvider as any).codeActionKinds).toEqual([CodeActionKind.RefactorExtract]);
            }
        });

        it('should configure completion provider with trigger characters', () => {
            const completionProvider = LspCapabilities.capabilities.completionProvider;

            expect(completionProvider).toBeDefined();
            if (completionProvider) {
                expect((completionProvider as any).triggerCharacters).toEqual(['.', '!', ':', '\n', '\t', '"']);
                expect((completionProvider as any).completionItem).toEqual({
                    labelDetailsSupport: true,
                });
            }
        });

        it('should enable definition provider', () => {
            expect(LspCapabilities.capabilities.definitionProvider).toBe(true);
        });

        it('should enable document symbol provider', () => {
            expect(LspCapabilities.capabilities.documentSymbolProvider).toBe(true);
        });

        it('should configure execute command provider with correct commands', () => {
            const executeCommandProvider = LspCapabilities.capabilities.executeCommandProvider;
            expect(executeCommandProvider).toBeDefined();
            expect((executeCommandProvider as any).commands).toEqual([
                CLEAR_DIAGNOSTIC,
                OPTIMIZE_TEMPLATE,
                DESCRIBE_TEMPLATE,
                GENERATE_TEMPLATE,
                ANALYZE_DIAGNOSTIC,
            ]);
        });

        it('should configure workspace capabilities', () => {
            const workspace = LspCapabilities.capabilities.workspace;

            expect(workspace).toBeDefined();
            if (workspace) {
                expect((workspace as any).workspaceFolders).toEqual({
                    supported: true,
                    changeNotifications: true,
                });
            }
        });
    });

    describe('server info', () => {
        it('should have correct server name and version', () => {
            const serverInfo = LspCapabilities.serverInfo;

            expect(serverInfo).toBeDefined();
            if (serverInfo) {
                expect(serverInfo.name).toBe(ExtensionName);
                expect(serverInfo.version).toBe(ExtensionVersion);
            }
        });
    });

    describe('capabilities completeness', () => {
        it('should have all required LSP capabilities', () => {
            const capabilities = LspCapabilities.capabilities;

            // Check that all major capability categories are present
            expect(capabilities.textDocumentSync).toBeDefined();
            expect(capabilities.hoverProvider).toBeDefined();
            expect(capabilities.completionProvider).toBeDefined();
            expect(capabilities.definitionProvider).toBeDefined();
            expect(capabilities.documentSymbolProvider).toBeDefined();
            expect(capabilities.codeActionProvider).toBeDefined();
            expect(capabilities.executeCommandProvider).toBeDefined();
            expect(capabilities.workspace).toBeDefined();
        });

        it('should be a valid InitializeResult structure', () => {
            expect(LspCapabilities.capabilities).toBeDefined();
            expect(LspCapabilities.serverInfo).toBeDefined();

            // Should have the structure expected by LSP
            expect(typeof LspCapabilities.capabilities).toBe('object');
            expect(typeof LspCapabilities.serverInfo).toBe('object');
        });
    });

    describe('trigger characters', () => {
        it('should include all necessary completion trigger characters', () => {
            const triggerChars = LspCapabilities.capabilities.completionProvider?.triggerCharacters;

            expect(triggerChars).toContain('.'); // For property access
            expect(triggerChars).toContain('!'); // For intrinsic functions
            expect(triggerChars).toContain(':'); // For YAML key-value pairs
            expect(triggerChars).toContain('\n'); // For new lines
            expect(triggerChars).toContain('\t'); // For tabs
            expect(triggerChars).toContain('"'); // For quoted strings
        });
    });
});
