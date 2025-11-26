import { describe, expect, test, beforeEach, it } from 'vitest';
import { DocumentSymbolParams, SymbolKind } from 'vscode-languageserver';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentSymbolRouter } from '../../../src/documentSymbol/DocumentSymbolRouter';
import { getYamlTemplate } from '../../utils/TemplateUtils';

describe('DocumentSymbolRouter', () => {
    let router: DocumentSymbolRouter;
    let syntaxTreeManager: SyntaxTreeManager;

    beforeEach(() => {
        syntaxTreeManager = new SyntaxTreeManager();
        router = new DocumentSymbolRouter(syntaxTreeManager);
    });

    test('should extract resource symbols from CloudFormation template', () => {
        // Use the same approach as SectionContextBuilder test
        const templateContent = getYamlTemplate();
        const uri = 'file:///test/sample_template.yaml';

        // Add the template to the syntax tree manager
        syntaxTreeManager.add(uri, templateContent);

        // Create document symbol params
        const params: DocumentSymbolParams = {
            textDocument: { uri },
        };

        // Get document symbols
        const symbols = router.getDocumentSymbols(params);

        // Verify we have symbols
        expect(symbols).toBeDefined();
        expect(symbols.length).toBeGreaterThan(0);

        // Find the Resources section
        const resourcesSection = symbols.find((s) => s.name === 'Resources');
        expect(resourcesSection).toBeDefined();
        expect(resourcesSection?.kind).toBe(SymbolKind.Namespace);
        expect(resourcesSection?.children).toBeDefined();

        expect(resourcesSection?.children?.length).toBeGreaterThan(0);

        // Check for specific resources
        const resourceNames = resourcesSection?.children?.map((r) => r.name) ?? [];
        expect(resourceNames).toContain('MyS3Bucket (AWS::S3::Bucket)');
        expect(resourceNames).toContain('MyEC2Instance (AWS::EC2::Instance)');

        // Find the Parameters section
        const parametersSection = symbols.find((s) => s.name === 'Parameters');
        expect(parametersSection).toBeDefined();
        expect(parametersSection?.kind).toBe(SymbolKind.Module);
        expect(parametersSection?.children).toBeDefined();
        expect(parametersSection?.children?.length).toBeGreaterThan(0);

        // Check for specific parameters
        const parameterNames = parametersSection?.children?.map((p) => p.name) ?? [];
        expect(parameterNames).toContain('StringParam (String)');
        expect(parameterNames).toContain('NumberParam (Number)');
        expect(parameterNames).toContain('EnvironmentType (String)');

        // Find the Outputs section
        const outputsSection = symbols.find((s) => s.name === 'Outputs');
        expect(outputsSection).toBeDefined();
        expect(outputsSection?.kind).toBe(SymbolKind.Interface);
        expect(outputsSection?.children).toBeDefined();
        expect(outputsSection?.children?.length).toBeGreaterThan(0);

        // Check for specific outputs
        const outputNames = outputsSection?.children?.map((o) => o.name) ?? [];
        expect(outputNames).toContain('BucketName');
    });

    test('should extract mapping symbols', () => {
        const templateContent = `
AWSTemplateFormatVersion: '2010-09-09'
Mappings:
  MyMap:
    Key1:
      SubKey1: Value1
      SubKey2: Value2
    Key2:
      SubKey3: Value3
      SubKey4: Value4
  AnotherMap:
    Region:
      us-east-1: ami-12345
      us-west-2: ami-67890
`;
        const uri = 'file:///test/mapping_template.yaml';

        syntaxTreeManager.add(uri, templateContent);

        const params: DocumentSymbolParams = {
            textDocument: { uri },
        };

        const symbols = router.getDocumentSymbols(params);

        // Find the Mappings section
        const mappingsSection = symbols.find((s) => s.name === 'Mappings');
        expect(mappingsSection).toBeDefined();
        expect(mappingsSection?.kind).toBe(SymbolKind.Object);
        expect(mappingsSection?.children).toBeDefined();
        expect(mappingsSection?.children?.length).toBe(2);

        // Check MyMap - should just show the logical ID without hierarchical children
        const myMap = mappingsSection?.children?.find((m) => m.name === 'MyMap');
        expect(myMap).toBeDefined();
        expect(myMap?.kind).toBe(SymbolKind.Object);
        expect(myMap?.children).toBeDefined();
        expect(myMap?.children?.length).toBe(0); // No hierarchical children

        // Check AnotherMap - should just show the logical ID without hierarchical children
        const anotherMap = mappingsSection?.children?.find((m) => m.name === 'AnotherMap');
        expect(anotherMap).toBeDefined();
        expect(anotherMap?.kind).toBe(SymbolKind.Object);
        expect(anotherMap?.children).toBeDefined();
        expect(anotherMap?.children?.length).toBe(0); // No hierarchical children
    });

    test('should handle empty template gracefully', () => {
        const uri = 'file:///test/empty.yaml';
        const emptyContent = '';

        syntaxTreeManager.add(uri, emptyContent);

        const params: DocumentSymbolParams = {
            textDocument: { uri },
        };

        const symbols = router.getDocumentSymbols(params);
        expect(symbols).toBeDefined();
        expect(symbols.length).toBe(0);
    });

    test('should handle missing syntax tree gracefully', () => {
        const params: DocumentSymbolParams = {
            textDocument: { uri: 'file:///test/nonexistent.yaml' },
        };

        const symbols = router.getDocumentSymbols(params);
        expect(symbols).toBeDefined();
        expect(symbols.length).toBe(0);
    });

    describe('malformed parameter handling', () => {
        it('should handle parameter without Type property gracefully', () => {
            // This is the problematic YAML that causes the error
            const malformedYaml = `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  TestParameter:`;

            const uri = 'file:///test.yaml';

            // Add the malformed template to the syntax tree manager
            syntaxTreeManager.add(uri, malformedYaml);

            const params: DocumentSymbolParams = {
                textDocument: { uri },
            };

            // This should not throw an error, even though TestParameter has no Type
            let symbols: any;
            expect(() => {
                symbols = router.getDocumentSymbols(params);
            }).not.toThrow();

            expect(symbols).toBeDefined();
            expect(Array.isArray(symbols)).toBe(true);

            // The main goal is that it doesn't crash - the exact structure may vary
            // depending on how the malformed YAML is parsed
        });

        it('should handle parameter with empty properties gracefully', () => {
            const malformedYaml = `AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  TestParameter:
    # No Type property defined yet`;

            const uri = 'file:///test2.yaml';

            syntaxTreeManager.add(uri, malformedYaml);

            const params: DocumentSymbolParams = {
                textDocument: { uri },
            };

            expect(() => {
                const symbols = router.getDocumentSymbols(params);
                expect(symbols).toBeDefined();
            }).not.toThrow();
        });

        it('should handle completely empty parameter section gracefully', () => {
            const malformedYaml = `AWSTemplateFormatVersion: "2010-09-09"
Parameters:`;

            const uri = 'file:///test3.yaml';

            syntaxTreeManager.add(uri, malformedYaml);

            const params: DocumentSymbolParams = {
                textDocument: { uri },
            };

            expect(() => {
                const symbols = router.getDocumentSymbols(params);
                expect(symbols).toBeDefined();
            }).not.toThrow();
        });
    });
});
