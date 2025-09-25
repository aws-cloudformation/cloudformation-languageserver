import { SyntaxNode } from 'tree-sitter';
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol/lib/common/protocol';
import { ServerComponents } from '../server/ServerComponents';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { Context } from './Context';
import { ContextWithRelatedEntities } from './ContextWithRelatedEntities';
import { PathAndEntity, SyntaxTree } from './syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from './syntaxtree/SyntaxTreeManager';

export class ContextManager {
    private readonly log = LoggerFactory.getLogger(ContextManager);

    constructor(private readonly syntaxTreeManager: SyntaxTreeManager) {}

    public getContext(params: TextDocumentPositionParams): Context | undefined {
        const contextParams = this.getContextParams(params);
        if (!contextParams) {
            return undefined;
        }

        try {
            return new Context(
                contextParams.currentNode,
                contextParams.pathInfo.path,
                contextParams.pathInfo.propertyPath,
                contextParams.tree.type,
                contextParams.pathInfo.entityRootNode,
            );
        } catch (error) {
            this.log.error(
                {
                    error: extractErrorMessage(error),
                    uri: params.textDocument.uri,
                    position: params.position,
                },
                'Could not get context',
            );
        }

        return undefined;
    }

    public getContextAndRelatedEntities(
        params: TextDocumentPositionParams,
        fullEntitySearch: boolean = true,
    ): ContextWithRelatedEntities | undefined {
        const contextParams = this.getContextParams(params);
        if (!contextParams) {
            return undefined;
        }

        try {
            const { tree, pathInfo, currentNode } = contextParams;
            const { path, propertyPath, entityRootNode } = pathInfo;

            return ContextWithRelatedEntities.create(
                currentNode,
                path,
                propertyPath,
                entityRootNode,
                tree,
                fullEntitySearch,
            );
        } catch (error) {
            this.log.error(
                {
                    error: extractErrorMessage(error),
                    uri: params.textDocument.uri,
                    position: params.position,
                },
                'Could not get context',
            );
        }

        return undefined;
    }

    public getContextFromPath(
        uri: string,
        pathSegments: ReadonlyArray<string | number>,
    ): { context: Context | undefined; fullyResolved: boolean } {
        const [tree, result] = this.getFromTree(uri, (tree) => tree.getNodeByPath(pathSegments));

        if (!result?.node || !tree) {
            return { context: undefined, fullyResolved: false };
        }

        try {
            const pathInfo = tree.getPathAndEntityInfo(result.node);
            const context = new Context(
                result.node,
                pathInfo.path,
                pathInfo.propertyPath,
                tree.type,
                pathInfo.entityRootNode,
            );

            return { context, fullyResolved: result.fullyResolved };
        } catch (error) {
            this.log.error(
                {
                    error: extractErrorMessage(error),
                    uri,
                    pathSegments,
                },
                'Could not get context from path',
            );
        }

        return { context: undefined, fullyResolved: false };
    }

    private getContextParams(params: TextDocumentPositionParams): ContextParams | undefined {
        const uri = params.textDocument.uri;
        const [tree, currentNode] = this.getFromTree(uri, (tree) => tree.getNodeAtPosition(params.position));
        if (!currentNode || !tree) {
            this.log.debug({ uri }, 'No syntax node found at position');
            return undefined;
        }

        const pathInfo = tree.getPathAndEntityInfo(currentNode);
        if (!pathInfo) {
            this.log.error({ uri }, 'Could not determine path for node');
            return undefined;
        }

        return {
            currentNode,
            pathInfo,
            tree,
        };
    }

    private getFromTree<T, K extends unknown[]>(
        uri: string,
        getFromTree: (tree: SyntaxTree, ...args: K) => T,
        ...args: K
    ): [SyntaxTree | undefined, T | undefined] {
        const tree = this.syntaxTreeManager.getSyntaxTree(uri);
        if (!tree) {
            return [undefined, undefined];
        }

        return [tree, getFromTree(tree, ...args)];
    }

    static create(components: ServerComponents) {
        return new ContextManager(components.syntaxTreeManager);
    }
}

type ContextParams = {
    currentNode: SyntaxNode;
    pathInfo: PathAndEntity;
    tree: SyntaxTree;
};
