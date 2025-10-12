import { CompletionItem, CompletionItemKind, CompletionParams, Position, TextEdit } from 'vscode-languageserver';
import { pseudoParameterDocsMap } from '../artifacts/PseudoParameterDocs';
import { Context } from '../context/Context';
import { IntrinsicFunction, PseudoParameter, TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Mapping, Parameter, Resource } from '../context/semantic/Entity';
import { EntityType } from '../context/semantic/SemanticTypes';
import { SyntaxTree } from '../context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../document/DocumentManager';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, createMarkupContent, createReplacementRange } from './CompletionUtils';

interface IntrinsicFunctionInfo {
    type: IntrinsicFunction;
    args: unknown;
}

const log = LoggerFactory.getLogger('IntrinsicFunctionArgumentCompletionProvider');

export class IntrinsicFunctionArgumentCompletionProvider implements CompletionProvider {
    private readonly subAutoCompletePrefix = '${';
    private readonly exclamationEscapeCharacter = '!';
    private readonly pseudoParameterCompletionItems = this.getPseudoParametersAsCompletionItems(pseudoParameterDocsMap);

    private readonly fuzzySearch = getFuzzySearchFunction({
        keys: [{ name: 'label', weight: 1 }],
        threshold: 0.5,
        distance: 10,
        minMatchCharLength: 1,
        shouldSort: true,
        ignoreLocation: false,
    });

    private readonly attributeFuzzySearch = getFuzzySearchFunction({
        keys: [{ name: 'filterText', weight: 1 }],
        threshold: 0.4,
        distance: 15,
        minMatchCharLength: 1,
        shouldSort: true,
        ignoreLocation: false,
    });

    constructor(
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly schemaRetriever: SchemaRetriever,
        private readonly documentManager: DocumentManager,
    ) {}

    getCompletions(context: Context, params: CompletionParams): CompletionItem[] | undefined {
        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(params.textDocument.uri);
        if (!syntaxTree) {
            return;
        }

        // Only handle contexts that are inside intrinsic functions
        if (!context?.intrinsicContext?.inIntrinsic()) {
            return undefined;
        }

        const intrinsicFunction = context.intrinsicContext.intrinsicFunction();
        if (!intrinsicFunction) {
            return undefined;
        }

        log.debug(
            {
                provider: 'IntrinsicFunctionArgument',
                context: context.record(),
                intrinsicFunction: intrinsicFunction.type,
            },
            'Processing intrinsic function argument completion request',
        );

        // Route to specific handlers based on intrinsic function type
        switch (intrinsicFunction.type) {
            case IntrinsicFunction.Ref: {
                return this.handleRefArguments(context, params, syntaxTree);
            }
            case IntrinsicFunction.Sub: {
                return this.handleSubArguments(context, params, syntaxTree);
            }
            case IntrinsicFunction.FindInMap: {
                return this.handleFindInMapArguments(context, params, syntaxTree, intrinsicFunction);
            }
            case IntrinsicFunction.GetAtt: {
                return this.handleGetAttArguments(context, params, syntaxTree, intrinsicFunction);
            }
            default: {
                return undefined;
            }
        }
    }

    private handleRefArguments(
        context: Context,
        params: CompletionParams,
        syntaxTree: SyntaxTree,
    ): CompletionItem[] | undefined {
        log.debug(
            {
                provider: 'IntrinsicFunctionArgument',
                function: 'Ref',
                context: context.record(),
            },
            'Processing Ref argument completion',
        );
        const parametersAndResourcesCompletions = this.getParametersAndResourcesAsCompletionItems(
            context,
            params,
            syntaxTree,
        );

        if (!parametersAndResourcesCompletions || parametersAndResourcesCompletions.length === 0) {
            return this.applyFuzzySearch(this.pseudoParameterCompletionItems, context.text);
        }

        return this.applyFuzzySearch(
            [...this.pseudoParameterCompletionItems, ...parametersAndResourcesCompletions],
            context.text,
        );
    }

    private handleSubArguments(
        context: Context,
        params: CompletionParams,
        syntaxTree: SyntaxTree,
    ): CompletionItem[] | undefined {
        log.debug(
            {
                provider: 'IntrinsicFunctionArgument',
                function: 'Sub',
                context: context.record(),
            },
            'Processing Sub argument completion',
        );
        const parametersAndResourcesCompletions = this.getParametersAndResourcesAsCompletionItems(
            context,
            params,
            syntaxTree,
        );
        const getAttCompletions = this.getGetAttCompletions(syntaxTree, context.logicalId);

        const baseItems = [...this.pseudoParameterCompletionItems];
        if (parametersAndResourcesCompletions && parametersAndResourcesCompletions.length > 0) {
            baseItems.push(...parametersAndResourcesCompletions);
        }
        if (getAttCompletions.length > 0) {
            baseItems.push(...getAttCompletions);
        }

        // Handle ${} parameter substitution context detection
        const subText = this.getTextForSub(params.textDocument.uri, params.position, context);
        if (subText !== undefined) {
            if (subText === '') {
                return [];
            }
            return this.applyFuzzySearch(baseItems, subText);
        }

        return this.applyFuzzySearch(baseItems, context.text);
    }

    private getParametersAndResourcesAsCompletionItems(
        context: Context,
        params: CompletionParams,
        syntaxTree: SyntaxTree,
    ): CompletionItem[] | undefined {
        // Get template parameters
        const parametersMap = getEntityMap(syntaxTree, TopLevelSection.Parameters);
        const parameterItems = parametersMap ? this.getParametersAsCompletionItems(parametersMap) : [];

        // Include resource completions when in Resources or Outputs sections
        const resourceItems = this.shouldIncludeResourceCompletions(context)
            ? this.getResourceCompletions(syntaxTree, context.logicalId)
            : [];

        return [...parameterItems, ...resourceItems];
    }

    private handleFindInMapArguments(
        context: Context,
        params: CompletionParams,
        syntaxTree: SyntaxTree,
        intrinsicFunction: IntrinsicFunctionInfo,
    ): CompletionItem[] | undefined {
        log.debug(
            { provider: 'FindInMap Completion', context: context.record() },
            'Processing FindInMap completion request',
        );

        // Validate that mappings exist in the template
        const mappingsMap = getEntityMap(syntaxTree, TopLevelSection.Mappings);
        if (!mappingsMap || mappingsMap.size === 0) {
            log.debug('No mappings found in template for FindInMap completion');
            return undefined;
        }

        try {
            // Determine position in FindInMap arguments
            const position = this.determineFindInMapPosition(intrinsicFunction.args, context);
            log.debug(`FindInMap argument position determined: ${position}`);

            // Get completions based on position
            const completions = this.getCompletionsByPosition(position, mappingsMap, intrinsicFunction.args, context);

            if (!completions) {
                log.debug(`No completions found for FindInMap position ${position}`);
                return undefined;
            }

            return completions;
        } catch (error) {
            log.error({ error }, 'Error processing FindInMap completions');
            return undefined;
        }
    }

    private handleGetAttArguments(
        context: Context,
        params: CompletionParams,
        syntaxTree: SyntaxTree,
        intrinsicFunction: IntrinsicFunctionInfo,
    ): CompletionItem[] | undefined {
        const resourceEntities = getEntityMap(syntaxTree, TopLevelSection.Resources);
        if (!resourceEntities || resourceEntities.size === 0) {
            return undefined;
        }

        const position = this.determineGetAttPosition(intrinsicFunction.args, context);

        if (position === 1) {
            return this.getGetAttResourceCompletions(resourceEntities, intrinsicFunction.args, context);
        } else if (position === 2) {
            return this.getGetAttAttributeCompletions(resourceEntities, intrinsicFunction.args, context);
        }

        return undefined;
    }

    private getPseudoParametersAsCompletionItems(
        pseudoParameterMap: ReadonlyMap<PseudoParameter, string>,
    ): CompletionItem[] {
        const completionItems: CompletionItem[] = [];
        for (const [paramName, doc] of pseudoParameterMap) {
            completionItems.push(
                createCompletionItem(paramName.toString(), CompletionItemKind.Reference, {
                    detail: 'Pseudo Parameter',
                    documentation: doc,
                }),
            );
        }

        return completionItems;
    }

    private getParametersAsCompletionItems(parametersMap: ReadonlyMap<string, Context>): CompletionItem[] {
        const completionItems: CompletionItem[] = [];
        for (const [paramName, context] of parametersMap) {
            const param = context.entity as Parameter;
            completionItems.push(
                createCompletionItem(paramName, CompletionItemKind.Reference, {
                    detail: `Parameter (${param.Type})`,
                    documentation: param.Description,
                }),
            );
        }

        return completionItems;
    }

    private shouldIncludeResourceCompletions(context: Context): boolean {
        // Only provide resource completions in Resources and Outputs sections
        return context.section === TopLevelSection.Resources || context.section === TopLevelSection.Outputs;
    }

    private getResourceCompletions(syntaxTree: SyntaxTree, currentLogicalId?: string): CompletionItem[] {
        const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
        if (!resourcesMap || resourcesMap.size === 0) {
            return [];
        }

        const completionItems: CompletionItem[] = [];

        for (const [resourceName, resourceContext] of resourcesMap) {
            // Skip the current resource to avoid circular references
            if (resourceName === currentLogicalId) {
                continue;
            }

            const resource = resourceContext.entity;

            completionItems.push(
                createCompletionItem(resourceName, CompletionItemKind.Reference, {
                    detail: typeof resource.Type === 'string' ? `Resource (${resource.Type})` : undefined,
                }),
            );
        }

        return completionItems;
    }

    private getResourceAttributes(resourceType: string): string[] {
        const schema = this.schemaRetriever.getDefault().schemas.get(resourceType);
        if (!schema?.readOnlyProperties || schema.readOnlyProperties.length === 0) {
            return [];
        }

        return schema.readOnlyProperties
            .map((propertyPath) => {
                const match = propertyPath.match(/^\/properties\/(.+)$/);
                return match ? match[1].replaceAll('/', '.') : undefined;
            })
            .filter((attr): attr is string => attr !== undefined)
            .filter((attr) => {
                const lastDotIndex = attr.lastIndexOf('.');
                if (lastDotIndex === -1) return true;
                const pathWithoutLastSegment = attr.slice(0, Math.max(0, lastDotIndex));
                return !pathWithoutLastSegment.includes('*');
            })
            .filter((attr, index, array) => array.indexOf(attr) === index);
    }

    private getGetAttCompletions(syntaxTree: SyntaxTree, currentLogicalId?: string): CompletionItem[] {
        const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
        if (!resourcesMap || resourcesMap.size === 0) {
            return [];
        }

        const completionItems: CompletionItem[] = [];

        for (const [resourceName, resourceContext] of resourcesMap) {
            if (resourceName === currentLogicalId) {
                continue;
            }

            const resource = resourceContext.entity as Resource;
            if (!resource.Type || typeof resource.Type !== 'string') {
                continue;
            }

            const attributes = this.getResourceAttributes(resource.Type);
            for (const attributeName of attributes) {
                const schema = this.schemaRetriever.getDefault().schemas.get(resource.Type);
                let attributeDescription = `GetAtt attribute for ${resource.Type}`;

                if (schema) {
                    const jsonPointerPath = `/properties/${attributeName.replaceAll('.', '/properties/')}`;

                    try {
                        const resolvedSchemas = schema.resolveJsonPointerPath(jsonPointerPath);
                        if (resolvedSchemas.length > 0 && resolvedSchemas[0].description) {
                            attributeDescription = resolvedSchemas[0].description;
                        }
                    } catch {
                        attributeDescription = `${attributeName} attribute of ${resource.Type}`;
                    }
                }
                completionItems.push(
                    createCompletionItem(`${resourceName}.${attributeName}`, CompletionItemKind.Property, {
                        detail: `GetAtt (${resource.Type})`,
                        documentation: createMarkupContent(attributeDescription),
                        data: {
                            isIntrinsicFunction: true,
                        },
                    }),
                );
            }
        }

        return completionItems;
    }

    private applyFuzzySearch(completionItems: CompletionItem[], text: string): CompletionItem[] {
        return text.length > 0 ? this.fuzzySearch(completionItems, text) : completionItems;
    }

    private getTextForSub(uri: string, position: Position, context: Context): string | undefined {
        if (!context.text.includes(this.subAutoCompletePrefix)) {
            return undefined;
        }

        const currentLine = this.documentManager.getLine(uri, position.line);
        if (!currentLine) {
            return undefined;
        }

        const currentIndex = position.character;

        const startIndex = currentLine.lastIndexOf(this.subAutoCompletePrefix, currentIndex - 1);
        if (startIndex === -1) {
            return undefined;
        }

        // Do not autocomplete if escape character ! is used. e.g. ${!Literal}
        if (currentLine[startIndex + 2] === this.exclamationEscapeCharacter) {
            return '';
        }

        const endIndex = currentLine.indexOf('}', startIndex);

        if (endIndex !== -1 && endIndex < currentIndex) {
            return '';
        }

        return currentLine.slice(startIndex + 2, endIndex === -1 ? currentLine.length : endIndex);
    }

    private determineFindInMapPosition(args: unknown, context: Context): number {
        // Default to position 1 (mapping name) if args is not an array
        if (!Array.isArray(args)) {
            return 1;
        }

        // If no text context, check if we have empty strings in args (indicating incomplete arguments)
        if (context.text.length === 0) {
            // Look for the first empty string argument, which indicates the position being completed
            for (const [i, arg] of args.entries()) {
                if (arg === '') {
                    return i + 1;
                }
            }
            // If no empty strings, we're adding a new argument
            return Math.max(1, args.length + 1);
        }

        // Find exact match first
        const exactMatchIndex = args.indexOf(context.text);
        if (exactMatchIndex !== -1) {
            return exactMatchIndex + 1;
        }

        // Check if we're typing in an existing argument position
        for (const [i, arg] of args.entries()) {
            if (
                typeof arg === 'string' && // If the existing argument is empty or the current text starts with it, we're editing that position
                (arg === '' || context.text.startsWith(arg))
            ) {
                return i + 1;
            }
        }

        // If no match found, we're typing in the next available position
        return Math.max(1, args.length + 1);
    }

    private getCompletionsByPosition(
        position: number,
        mappingsEntities: Map<string, Context>,
        args: unknown,
        context: Context,
    ): CompletionItem[] | undefined {
        // Validate position is within expected range for FindInMap (1-3)
        if (position < 1 || position > 3) {
            log.debug(`Invalid FindInMap position: ${position}`);
            return undefined;
        }

        switch (position) {
            case 1: {
                return this.getMappingNameCompletions(mappingsEntities, context);
            }
            case 2: {
                return this.getTopLevelKeyCompletions(mappingsEntities, args, context);
            }
            case 3: {
                return this.getSecondLevelKeyCompletions(mappingsEntities, args, context);
            }
            default: {
                return undefined;
            }
        }
    }

    private getMappingNameCompletions(mappingsEntities: Map<string, Context>, context: Context): CompletionItem[] {
        try {
            const items = [...mappingsEntities.keys()].map((key) =>
                createCompletionItem(key, CompletionItemKind.EnumMember, { context }),
            );

            return context.text.length > 0 ? this.fuzzySearch(items, context.text) : items;
        } catch (error) {
            log.error({ error }, 'Error creating mapping name completions');
            return [];
        }
    }

    private getTopLevelKeyCompletions(
        mappingsEntities: Map<string, Context>,
        args: unknown,
        context: Context,
    ): CompletionItem[] | undefined {
        // Validate arguments structure
        if (!Array.isArray(args) || args.length === 0 || typeof args[0] !== 'string') {
            log.debug('Invalid arguments for top-level key completions');
            return undefined;
        }

        try {
            const mappingName = args[0];
            const mappingEntity = this.getMappingEntity(mappingsEntities, mappingName);
            if (!mappingEntity) {
                log.debug(`Mapping entity not found: ${mappingName}`);
                return undefined;
            }

            const topLevelKeys = mappingEntity.getTopLevelKeys();
            if (topLevelKeys.length === 0) {
                log.debug(`No top-level keys found for mapping: ${mappingName}`);
                return undefined;
            }

            const items = topLevelKeys.map((key) =>
                createCompletionItem(key, CompletionItemKind.EnumMember, { context }),
            );

            return context.text.length > 0 ? this.fuzzySearch(items, context.text) : items;
        } catch (error) {
            log.error({ error }, 'Error creating top-level key completions');
            return undefined;
        }
    }

    private getSecondLevelKeyCompletions(
        mappingsEntities: Map<string, Context>,
        args: unknown,
        context: Context,
    ): CompletionItem[] | undefined {
        // Validate arguments structure for second-level keys
        if (!Array.isArray(args) || args.length < 2 || typeof args[0] !== 'string' || typeof args[1] !== 'string') {
            log.debug('Invalid arguments for second-level key completions');
            return undefined;
        }

        try {
            const mappingName = args[0];
            const topLevelKey = args[1];

            const mappingEntity = this.getMappingEntity(mappingsEntities, mappingName);
            if (!mappingEntity) {
                log.debug(`Mapping entity not found: ${mappingName}`);
                return undefined;
            }

            const secondLevelKeys = mappingEntity.getSecondLevelKeys(topLevelKey);
            if (secondLevelKeys.length === 0) {
                log.debug(`No second-level keys found for mapping: ${mappingName}, top-level key: ${topLevelKey}`);
                return undefined;
            }

            const items = secondLevelKeys.map((key) =>
                createCompletionItem(key, CompletionItemKind.EnumMember, { context }),
            );

            return context.text.length > 0 ? this.fuzzySearch(items, context.text) : items;
        } catch (error) {
            log.error({ error }, 'Error creating second-level key completions');
            return undefined;
        }
    }

    private getMappingEntity(mappingsEntities: Map<string, Context>, mappingName: string): Mapping | undefined {
        try {
            const mappingContext = mappingsEntities.get(mappingName);
            if (!mappingContext?.entity || mappingContext.entity.entityType !== EntityType.Mapping) {
                return undefined;
            }
            return mappingContext.entity as Mapping;
        } catch (error) {
            log.error({ error }, `Error retrieving mapping entity: ${mappingName}`);
            return undefined;
        }
    }

    private determineGetAttPosition(args: unknown, context: Context): number {
        if (typeof args === 'string') {
            const dotIndex = args.indexOf('.');
            if (dotIndex === -1) {
                return 1;
            }

            const resourcePart = args.slice(0, dotIndex);

            if (context.text === resourcePart) {
                return 1;
            }

            if (context.text.length > 0 && resourcePart.startsWith(context.text)) {
                return 1;
            }

            return 2;
        }

        if (!Array.isArray(args)) {
            return 0;
        }

        if (args.length === 0) {
            return 1;
        }

        if (args.length === 1 && args[0] === context.text) {
            return 1;
        }

        if (args.length >= 2 && args[1] === context.text) {
            return 2;
        }

        return 2;
    }

    private getGetAttResourceCompletions(
        resourceEntities: Map<string, Context>,
        args: unknown,
        context: Context,
    ): CompletionItem[] | undefined {
        // GetAtt only accepts arrays or strings, short circuit for invalid types
        if (!Array.isArray(args) && typeof args !== 'string') {
            return undefined;
        }

        if (!this.isAtGetAttResourcePosition(args, context)) {
            return undefined;
        }

        const items = [...resourceEntities.keys()]
            .filter((logicalId) => logicalId !== context.logicalId)
            .map((logicalId) => createCompletionItem(logicalId, CompletionItemKind.Reference, { context }));

        return context.text.length > 0 ? this.fuzzySearch(items, context.text) : items;
    }

    private isAtGetAttResourcePosition(args: string | unknown[], context: Context): boolean {
        if (Array.isArray(args)) {
            if (args.length === 0) {
                return true;
            }
            return args[0] === context.text;
        }

        return args === context.text;
    }

    private getGetAttAttributeCompletions(
        resourceEntities: Map<string, Context>,
        args: unknown,
        context: Context,
    ): CompletionItem[] | undefined {
        const resourceLogicalId = this.extractGetAttResourceLogicalId(args);

        if (!resourceLogicalId) {
            return undefined;
        }

        const resourceContext = resourceEntities.get(resourceLogicalId);
        if (!resourceContext?.entity || resourceContext.entity.entityType !== EntityType.Resource) {
            return undefined;
        }

        const resource = resourceContext.entity as Resource;
        const resourceType = resource.Type;
        if (!resourceType || typeof resourceType !== 'string') {
            return undefined;
        }

        const attributes = this.getResourceAttributes(resource.Type);
        if (attributes.length === 0) {
            return undefined;
        }

        const completionItems = attributes.map((attributeName) => {
            const schema = this.schemaRetriever.getDefault().schemas.get(resourceType);
            let documentation;

            if (schema) {
                const jsonPointerPath = `/properties/${attributeName.replaceAll('.', '/properties/')}`;
                documentation = createMarkupContent(
                    `**${attributeName}** attribute of **${resource.Type}**\n\nReturns the value of this attribute when used with the GetAtt intrinsic function.`,
                );

                try {
                    const resolvedSchemas = schema.resolveJsonPointerPath(jsonPointerPath);

                    if (resolvedSchemas.length > 0) {
                        const firstSchema = resolvedSchemas[0];

                        if (firstSchema.description) {
                            documentation = createMarkupContent(firstSchema.description);
                        }
                    }
                } catch (error) {
                    log.debug(error);
                }
            }

            const item = createCompletionItem(attributeName, CompletionItemKind.Property, {
                documentation: documentation,
                detail: `GetAtt attribute for ${resource.Type}`,
            });

            if (context.text.length > 0) {
                const range = createReplacementRange(context);
                if (range) {
                    if (typeof args === 'string' && args.includes('.')) {
                        item.textEdit = TextEdit.replace(range, resourceLogicalId + '.' + attributeName);
                        item.filterText = `${resourceLogicalId}.${attributeName}`;
                    } else {
                        item.textEdit = TextEdit.replace(range, attributeName);
                    }
                    delete item.insertText;
                }
            }

            return item;
        });

        return context.text.length > 0 ? this.attributeFuzzySearch(completionItems, context.text) : completionItems;
    }

    private extractGetAttResourceLogicalId(args: unknown): string | undefined {
        if (typeof args === 'string') {
            const dotIndex = args.indexOf('.');
            if (dotIndex !== -1) {
                return args.slice(0, Math.max(0, dotIndex));
            }
            return args;
        }

        if (Array.isArray(args) && args.length > 0 && typeof args[0] === 'string') {
            // Array format
            return args[0];
        }

        return undefined;
    }
}
