import { describe, it, expect, beforeEach, vi, Mocked } from 'vitest';
import { DefinitionParams, CancellationToken, Location } from 'vscode-languageserver';
import { DefinitionProvider } from '../../../src/definition/DefinitionProvider';
import { definitionHandler } from '../../../src/handlers/DefinitionHandler';
import { createMockComponents } from '../../utils/MockServerComponents';
import { createMockJsonSyntaxTree } from '../../utils/TestTree';

describe('DefinitionHandler', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;
    let mockDefinitionProvider: Mocked<DefinitionProvider>;
    let handler: any;
    let params: DefinitionParams;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDefinitionProvider = {
            getDefinitions: vi.fn(),
        } as unknown as Mocked<DefinitionProvider>;

        mockComponents = createMockComponents({ definitionProvider: mockDefinitionProvider });
        mockComponents.syntaxTreeManager.getSyntaxTree.returns(createMockJsonSyntaxTree());

        handler = definitionHandler(mockComponents);
        params = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
        };
    });

    it('should return definition results when syntax tree exists', () => {
        const token = {} as CancellationToken;
        const mockLocation = Location.create(params.textDocument.uri, {
            start: { line: 5, character: 10 },
            end: { line: 5, character: 20 },
        });
        mockDefinitionProvider.getDefinitions.mockReturnValue(mockLocation);

        const result = handler(params, token);

        expect(result).toEqual(mockLocation);
        expect(mockDefinitionProvider.getDefinitions).toHaveBeenCalledWith(params);
    });

    it('should return undefined when definition provider returns undefined', () => {
        const token = {} as CancellationToken;
        mockDefinitionProvider.getDefinitions.mockReturnValue(undefined);

        const result = handler(params, token);

        expect(result).toBeUndefined();
        expect(mockDefinitionProvider.getDefinitions).toHaveBeenCalledWith(params);
    });

    it('should return multiple locations when definition provider returns an array', () => {
        const token = {} as CancellationToken;
        const mockLocations = [
            Location.create(params.textDocument.uri, {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 },
            }),
            Location.create(params.textDocument.uri, {
                start: { line: 10, character: 15 },
                end: { line: 10, character: 25 },
            }),
        ];
        mockDefinitionProvider.getDefinitions.mockReturnValue(mockLocations);

        const result = handler(params, token);

        expect(result).toEqual(mockLocations);
        expect(mockDefinitionProvider.getDefinitions).toHaveBeenCalledWith(params);
    });
});
