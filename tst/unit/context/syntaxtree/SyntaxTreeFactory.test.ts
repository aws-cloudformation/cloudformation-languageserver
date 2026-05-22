import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyntaxTreeFactory } from '../../../../src/context/syntaxtree/SyntaxTreeFactory';
import { FeatureFlag } from '../../../../src/featureFlag/FeatureFlagI';
import { parserFactory } from '../../../../src/parser/ParserFactory';
import { DocumentType } from '../../../../src/document/Document';

describe('SyntaxTreeFactory', () => {
    let factory: SyntaxTreeFactory;

    beforeEach(() => {
        factory = new SyntaxTreeFactory(parserFactory);
    });

    it('should create YAML syntax tree', () => {
        const tree = factory.createSyntaxTree('key: value', DocumentType.YAML);
        expect(tree).toBeDefined();
        expect(tree.type).toBe(DocumentType.YAML);
    });

    it('should create JSON syntax tree', () => {
        const tree = factory.createSyntaxTree('{"key": "value"}', DocumentType.JSON);
        expect(tree).toBeDefined();
        expect(tree.type).toBe(DocumentType.JSON);
    });

    it('should default to native parser type', () => {
        expect(factory.parserType).toBe('native');
    });

    it('should stay native when wasm feature flag is disabled', () => {
        const flag: FeatureFlag = { isEnabled: () => false, describe: () => 'WasmParser: disabled' };
        factory.initialize(flag);
        expect(factory.parserType).toBe('native');
    });

    it('should switch to wasm when feature flag is enabled', () => {
        const flag: FeatureFlag = { isEnabled: () => true, describe: () => 'WasmParser: enabled' };
        factory.initialize(flag);
        expect(factory.parserType).toBe('wasm');
    });

    it('should check feature flag exactly once during initialize', () => {
        const isEnabled = vi.fn(() => false);
        const flag: FeatureFlag = { isEnabled, describe: () => 'test' };
        factory.initialize(flag);
        expect(isEnabled).toHaveBeenCalledOnce();
    });
});
