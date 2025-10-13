import { CompletionList, CompletionParams } from 'vscode-languageserver';
import { TextDocuments } from 'vscode-languageserver/node';
import {
    TextDocumentContentChangeEvent,
    TextDocumentPositionParams,
} from 'vscode-languageserver-protocol/lib/common/protocol';
import { Position, Range, TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionRouter, createCompletionProviders } from '../../src/autocomplete/CompletionRouter';
import { Context, SectionType } from '../../src/context/Context';
import { ContextManager } from '../../src/context/ContextManager';
import { TopLevelSection } from '../../src/context/ContextType';
import { SyntaxTreeManager } from '../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentType } from '../../src/document/Document';
import { DocumentManager } from '../../src/document/DocumentManager';
import { HoverRouter } from '../../src/hover/HoverRouter';
import { SchemaRetriever } from '../../src/schema/SchemaRetriever';
import { extractErrorMessage } from '../../src/utils/Errors';
import { expectThrow } from './Expect';
import {
    createMockComponents,
    createMockResourceStateManager,
    createMockSchemaRetriever,
} from './MockServerComponents';
import { combinedSchemas } from './SchemaUtils';

function expectAt(actual: any, position: Position, description?: string) {
    const positionStr = `${position.line}:${position.character}`;
    const errorContext = description ? ` ${description}` : '';

    return expectThrow(actual, `${errorContext} at ${positionStr}`);
}

class Expectation {
    public todo: boolean = false;
    public todoComment?: string;
}

class ContextExpectation extends Expectation {
    text?: string;
    isTopLevel?: boolean;
    section?: SectionType;
    logicalId?: string;
    propertyPath?: (string | number)[];
    entitySection?: string | number;
    isResourceType?: boolean;
    isIntrinsicFunc?: boolean;
    isPseudoParameter?: boolean;
    isResourceAttribute?: boolean;
    entityType?: string;
    entityProperties?: Record<string, any>;
}

class CompletionExpectation extends Expectation {
    items?: string[];
    minItems?: number;
    maxItems?: number;
    containsItems?: string[];
    excludesItems?: string[];
    isIncomplete?: boolean;
    itemDetails?: {
        [label: string]: {
            kind?: number;
            detail?: string;
            documentation?: string;
            insertText?: string;
            textEdit?: {
                newText: string;
            };
        };
    };
}

class HoverExpectation extends Expectation {
    content?: string;
    containsText?: string[];
    excludesText?: string[];
    isEmpty?: boolean;
    isUndefined?: boolean;
    matchesRegex?: RegExp;
    minLength?: number;
    maxLength?: number;
    startsWith?: string;
    endsWith?: string;
}

type BuildStep = {
    action: 'initialize' | 'type' | 'replace' | 'delete';
    content?: string;
    range?: Range; // For replace and delete operations
    position?: Position; // For type operations
    description?: string;
    // Test verification at a specific position after the action
    verification?: {
        position: Position; // Exact position to test
        expectation: Expectation;
        description?: string;
        triggerCharacter?: string; // Optional trigger character for completions
    };
};

export type TemplateScenario = {
    name: string;
    steps: BuildStep[];
    finalContent?: string;
};

export class TemplateBuilder {
    private readonly textDocuments: TextDocuments<TextDocument>;
    private readonly syntaxTreeManager: SyntaxTreeManager;
    private readonly documentManager: DocumentManager;
    private readonly contextManager: ContextManager;
    private readonly schemaRetriever: SchemaRetriever;
    private readonly completionRouter: CompletionRouter;
    private readonly hoverRouter: HoverRouter;
    private readonly uri: string;
    private version: number = 0;

    constructor(format: DocumentType, startingContent: string = '') {
        this.uri = `file:///test-template.${format}`;
        this.textDocuments = new TextDocuments(TextDocument);
        this.syntaxTreeManager = new SyntaxTreeManager();
        this.documentManager = new DocumentManager(this.textDocuments);
        this.contextManager = new ContextManager(this.syntaxTreeManager);
        this.schemaRetriever = createMockSchemaRetriever(combinedSchemas());

        const mockTestComponents = createMockComponents({
            schemaRetriever: this.schemaRetriever,
            syntaxTreeManager: this.syntaxTreeManager,
            documentManager: this.documentManager,
            resourceStateManager: createMockResourceStateManager(),
        });

        const { core, external, providers } = createMockComponents(mockTestComponents);
        const completionProviders = createCompletionProviders(core, external, providers);

        this.completionRouter = new CompletionRouter(this.contextManager, completionProviders, this.documentManager);
        this.hoverRouter = new HoverRouter(this.contextManager, this.schemaRetriever);
        this.initialize(startingContent);
    }

    executeScenario(scenario: TemplateScenario): void {
        for (const step of scenario.steps) {
            this.executeAction(step);

            let exception: unknown;
            try {
                this.executeVerification(step);
            } catch (error: unknown) {
                exception = error;
            }

            if (step.verification?.expectation?.todo === true && exception === undefined) {
                const todoComment = step.verification.expectation.todoComment;
                const commentSuffix = todoComment ? ` - TODO: ${todoComment}` : '';
                throw new Error(
                    `TODO did not throw exception${step.description ? ` - ${step.description}` : ''}${commentSuffix}`,
                );
            } else if (step.verification?.expectation?.todo === false && exception !== undefined) {
                throw new Error(`${extractErrorMessage(exception)}${step.description ? ` - ${step.description}` : ''}`);
            }
        }

        if (scenario.finalContent) {
            expectThrow(this.getCurrentContent(), 'Final content check').toBe(scenario.finalContent);
        }
    }

    initialize(content: string = ''): void {
        this.version = 1;

        // Create a TextDocument and add it to the TextDocuments collection
        const textDocument = TextDocument.create(this.uri, 'yaml', this.version, content);

        // Manually add the document to the TextDocuments collection
        // This simulates what happens when LSP receives a didOpen notification
        (this.textDocuments as any)._syncedDocuments.set(this.uri, textDocument);

        // Create syntax tree if content is provided (simulating didOpenHandler behavior)
        if (content) {
            try {
                this.syntaxTreeManager.add(this.uri, content);
            } catch {
                // Ignore syntax tree creation errors in tests
            }
        }
    }

    typeAt(position: Position, text: string): void {
        this.sendLspChange({
            range: {
                start: position,
                end: position,
            },
            text,
        });
    }

    replaceRange(range: Range, text: string): void {
        this.sendLspChange({
            range,
            text,
        });
    }

    deleteRange(range: Range): void {
        this.sendLspChange({
            range,
            text: '',
        });
    }

    private sendLspChange(change: TextDocumentContentChangeEvent): void {
        // Increment version (as LSP would do)
        this.version++;

        // Get the current TextDocument
        const currentDoc = this.textDocuments.get(this.uri);
        if (!currentDoc) {
            throw new Error(`Document ${this.uri} not found`);
        }

        // Update the TextDocument with the change
        const updatedDoc = TextDocument.update(currentDoc, [change], this.version);

        // Update the TextDocuments collection
        (this.textDocuments as any)._syncedDocuments.set(this.uri, updatedDoc);

        // Update or create syntax tree (simulating didChangeHandler behavior)
        try {
            const newContent = updatedDoc.getText();
            if (newContent.trim()) {
                // Always recreate syntax tree for simplicity in tests
                this.syntaxTreeManager.add(this.uri, newContent);
            }
        } catch {
            // Ignore syntax tree update errors in tests
        }
    }

    private executeVerification(step: BuildStep) {
        if (step.verification?.expectation instanceof ContextExpectation) {
            this.verifyContextAt(
                step.verification.position,
                step.verification.expectation,
                step.verification.description,
            );
        } else if (step.verification?.expectation instanceof CompletionExpectation) {
            this.verifyCompletionsAt(
                step.verification.position,
                step.verification.expectation,
                step.verification.description,
                step.verification.triggerCharacter,
            );
        } else if (step.verification?.expectation instanceof HoverExpectation) {
            this.verifyHoverAt(
                step.verification.position,
                step.verification.expectation,
                step.verification.description,
            );
        }
    }

    verifyContextAt(position: Position, expected: ContextExpectation, description?: string): void {
        const context = this.getContextAt(position);
        expectAt(context, position, `No context found${description ? ` for ${description}` : ''}`).toBeDefined();

        if (expected.text !== undefined) {
            expectAt(context!.text, position, `Text mismatch${description ? ` for ${description}` : ''}`).toBe(
                expected.text,
            );
        }

        expectAt(context!.isTopLevel, position, `isTopLevel mismatch${description ? ` for ${description}` : ''}`).toBe(
            expected.isTopLevel ?? 'Unknown',
        );

        if (expected.section !== undefined) {
            expectAt(context!.section, position, `Section mismatch${description ? ` for ${description}` : ''}`).toBe(
                expected.section,
            );
        }

        expectAt(context?.logicalId, position, `LogicalId mismatch${description ? ` for ${description}` : ''}`).toBe(
            expected.logicalId,
        );

        if (expected.propertyPath !== undefined) {
            const actualPath = [...context!.propertyPath];
            expectAt(actualPath, position, `PropertyPath mismatch${description ? ` for ${description}` : ''}`).toEqual(
                expected.propertyPath,
            );
        }

        if (expected.entitySection !== undefined) {
            expectAt(
                context!.entitySection,
                position,
                `EntitySection mismatch${description ? ` for ${description}` : ''}`,
            ).toBe(expected.entitySection);
        }

        if (expected.isResourceType !== undefined) {
            expectAt(
                context!.isResourceType,
                position,
                `isResourceType mismatch${description ? ` for ${description}` : ''}`,
            ).toBe(expected.isResourceType);
        }

        if (expected.isIntrinsicFunc !== undefined) {
            expectAt(
                context!.isIntrinsicFunc,
                position,
                `isIntrinsicFunc mismatch${description ? ` for ${description}` : ''}`,
            ).toBe(expected.isIntrinsicFunc);
        }

        if (expected.isPseudoParameter !== undefined) {
            expectAt(
                context!.isPseudoParameter,
                position,
                `isPseudoParameter mismatch${description ? ` for ${description}` : ''}`,
            ).toBe(expected.isPseudoParameter);
        }

        if (expected.isResourceAttribute !== undefined) {
            expectAt(
                context!.isResourceAttribute,
                position,
                `isResourceAttribute mismatch${description ? ` for ${description}` : ''}`,
            ).toBe(expected.isResourceAttribute);
        }

        if (expected.entityType !== undefined) {
            expectAt(
                context!.entity.entityType,
                position,
                `EntityType mismatch${description ? ` for ${description}` : ''}`,
            ).toBe(expected.entityType);
        }

        if (expected.entityProperties !== undefined) {
            const actualProperties = context!.entity.record();
            for (const [key, expectedValue] of Object.entries(expected.entityProperties)) {
                expectAt(
                    actualProperties[key],
                    position,
                    `Entity property '${key}' mismatch${description ? ` for ${description}` : ''}`,
                ).toEqual(expectedValue);
            }
        }
    }

    getContextAt(position: Position): Context | undefined {
        const params: TextDocumentPositionParams = {
            textDocument: { uri: this.uri },
            position,
        };
        return this.contextManager.getContext(params);
    }

    getCompletionsAt(position: Position, triggerCharacter?: string): CompletionList | undefined {
        const params: CompletionParams = {
            textDocument: { uri: this.uri },
            position,
            context: triggerCharacter ? { triggerKind: 2, triggerCharacter } : { triggerKind: 2 },
        };
        return this.completionRouter.getCompletions(params) as CompletionList | undefined;
    }

    expectHoverAt(position: Position) {
        const result = this.getHoverAt(position);
        return expectAt(result, position, 'hover content');
    }

    expectContextAt(position: Position) {
        const result = this.getContextAt(position);
        return expectAt(result, position, 'context');
    }

    expectCompletionsAt(position: Position, triggerCharacter?: string) {
        const result = this.getCompletionsAt(position, triggerCharacter);
        return expectAt(result, position, 'completions');
    }

    verifyCompletionsAt(
        position: Position,
        expected: CompletionExpectation,
        description?: string,
        triggerCharacter?: string,
    ): void {
        const completions = this.getCompletionsAt(position, triggerCharacter);
        const desc = description ? ` (${description})` : '';

        if (!completions) {
            if (expected.items && expected.items.length > 0) {
                throw new Error(`Expected completions${desc}, but got none`);
            }
            return;
        }

        if (expected.isIncomplete !== undefined) {
            expectAt(completions.isIncomplete, position, `isIncomplete mismatch${desc}`).toBe(expected.isIncomplete);
        }

        const actualLabels = completions.items.map((item) => item.label);
        if (expected.items) {
            // Check if all expected items are present
            for (const expectedItem of expected.items) {
                if (!actualLabels.includes(expectedItem)) {
                    throw new Error(
                        `Completion items mismatch${desc} at ${position.line}:${position.character}: missing expected item ${JSON.stringify(expectedItem)} and got ${JSON.stringify(actualLabels)}`,
                    );
                }
            }
            expectAt(
                actualLabels.length,
                position,
                `Completion items count mismatch${desc}: got ${JSON.stringify(actualLabels)}`,
            ).toBe(expected.items.length);
        }

        if (expected.minItems !== undefined) {
            expectAt(actualLabels.length, position, `Minimum items check${desc}`).toBeGreaterThanOrEqual(
                expected.minItems,
            );
        }

        if (expected.maxItems !== undefined) {
            expectAt(actualLabels.length, position, `Maximum items check${desc}`).toBeLessThanOrEqual(
                expected.maxItems,
            );
        }

        if (expected.containsItems) {
            for (const expectedItem of expected.containsItems) {
                expectAt(actualLabels, position, `Missing expected item '${expectedItem}'${desc}`).toContain(
                    expectedItem,
                );
            }
        }

        if (expected.excludesItems) {
            for (const excludedItem of expected.excludesItems) {
                expectAt(actualLabels, position, `Unexpected item '${excludedItem}'${desc}`).not.toContain(
                    excludedItem,
                );
            }
        }

        if (expected.itemDetails) {
            for (const [label, details] of Object.entries(expected.itemDetails)) {
                const item = completions.items.find((i) => i.label === label);
                expectAt(item, position, `Item '${label}' not found${desc}`).toBeDefined();

                if (item) {
                    if (details.kind !== undefined) {
                        expectAt(item.kind, position, `Kind mismatch for item '${label}'${desc}`).toBe(details.kind);
                    }
                    if (details.detail !== undefined) {
                        expectAt(item.detail, position, `Detail mismatch for item '${label}'${desc}`).toBe(
                            details.detail,
                        );
                    }
                    if (details.documentation !== undefined) {
                        expectAt(
                            item.documentation,
                            position,
                            `Documentation mismatch for item '${label}'${desc}`,
                        ).toBe(details.documentation);
                    }
                    if (details.insertText !== undefined) {
                        expectAt(item.insertText, position, `InsertText mismatch for item '${label}'${desc}`).toBe(
                            details.insertText,
                        );
                    }
                    if (details.textEdit?.newText !== undefined) {
                        expectAt(
                            item.textEdit?.newText,
                            position,
                            `TextEdit NewText mismatch for item '${label}'${desc}`,
                        ).toBe(details.textEdit?.newText);
                    }
                }
            }
        }
    }

    getHoverAt(position: Position): string | undefined {
        const params: TextDocumentPositionParams = {
            textDocument: { uri: this.uri },
            position,
        };
        return this.hoverRouter.getHoverDoc(params);
    }

    verifyHoverAt(position: Position, expected: HoverExpectation, description?: string): void {
        const hoverContent = this.getHoverAt(position);
        const desc = description ? ` (${description})` : '';

        if (expected.isUndefined) {
            expectAt(hoverContent, position, `Expected no hover${desc}`).toBeUndefined();
            return;
        }

        if (expected.isEmpty) {
            expectAt(hoverContent, position, `Expected empty hover${desc}`).toBe('');
            return;
        }

        if (!hoverContent && (expected.content || expected.containsText || expected.matchesRegex)) {
            throw new Error(`Expected hover content${desc}, but got undefined`);
        }

        if (hoverContent) {
            if (expected.content !== undefined) {
                expectAt(hoverContent, position, `Hover content mismatch${desc}`).toBe(expected.content);
            }

            if (expected.containsText) {
                for (const expectedText of expected.containsText) {
                    expectAt(
                        hoverContent,
                        position,
                        `Missing expected text '${expectedText}' in hover${desc}`,
                    ).toContain(expectedText);
                }
            }

            if (expected.excludesText) {
                for (const excludedText of expected.excludesText) {
                    expectAt(hoverContent, position, `Unexpected text '${excludedText}' in hover${desc}`).not.toContain(
                        excludedText,
                    );
                }
            }

            if (expected.matchesRegex) {
                expectAt(
                    expected.matchesRegex.test(hoverContent),
                    position,
                    `Hover content does not match regex${desc}`,
                ).toBe(true);
            }

            if (expected.minLength !== undefined) {
                expectAt(hoverContent.length, position, `Hover content too short${desc}`).toBeGreaterThanOrEqual(
                    expected.minLength,
                );
            }

            if (expected.maxLength !== undefined) {
                expectAt(hoverContent.length, position, `Hover content too long${desc}`).toBeLessThanOrEqual(
                    expected.maxLength,
                );
            }

            if (expected.startsWith) {
                expectAt(
                    hoverContent,
                    position,
                    `Hover content does not start with '${expected.startsWith}'${desc}`,
                    // eslint-disable-next-line security/detect-non-literal-regexp
                ).toMatch(new RegExp('^' + expected.startsWith.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')));
            }

            if (expected.endsWith) {
                expectAt(
                    hoverContent,
                    position,
                    `Hover content does not end with '${expected.endsWith}'${desc}`,
                    // eslint-disable-next-line security/detect-non-literal-regexp
                ).toMatch(new RegExp(expected.endsWith.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
            }
        }
    }

    getCurrentContent() {
        const textDocument = this.textDocuments.get(this.uri);
        return textDocument?.getText() ?? '';
    }

    private executeAction(step: BuildStep): void {
        const stepIdentifier = `${step.action}${step.description ? ` - ${step.description}` : ''}`;

        switch (step.action) {
            case 'initialize':
                this.initialize(step.content ?? '');
                break;
            case 'type':
                if (!step.position) {
                    throw new Error(`Step "${stepIdentifier}" requires position parameter for type action`);
                }
                if (step.content === undefined) {
                    throw new Error(`Step "${stepIdentifier}" requires content parameter for type action`);
                }
                this.typeAt(step.position, step.content);
                break;
            case 'replace':
                if (!step.range) {
                    throw new Error(`Step "${stepIdentifier}" requires range parameter for replace action`);
                }
                if (step.content === undefined) {
                    throw new Error(`Step "${stepIdentifier}" requires content parameter for replace action`);
                }
                this.replaceRange(step.range, step.content);
                break;
            case 'delete':
                if (!step.range) {
                    throw new Error(`Step "${stepIdentifier}" requires range parameter for delete action`);
                }
                this.deleteRange(step.range);
                break;
        }
    }
}

export class ContextExpectationBuilder {
    private readonly expectation: ContextExpectation = new ContextExpectation();

    constructor(text?: string) {
        if (text !== undefined) {
            this.expectation.text = text;
        }
    }

    static text(text?: string): ContextExpectationBuilder {
        return new ContextExpectationBuilder(text);
    }

    static topLevel(text: string, section?: SectionType): ContextExpectationBuilder {
        return new ContextExpectationBuilder(text).setSection(section);
    }

    static resource(text: string, logicalId: string, propertyPath?: (string | number)[]): ContextExpectationBuilder {
        return new ContextExpectationBuilder(text)
            .setTopLevel(false)
            .setSection(TopLevelSection.Resources)
            .setLogicalId(logicalId)
            .setPropertyPath(propertyPath ?? ['Resources', logicalId]);
    }

    static parameter(text: string, logicalId: string, propertyPath?: (string | number)[]): ContextExpectationBuilder {
        return new ContextExpectationBuilder(text)
            .setTopLevel(false)
            .setSection(TopLevelSection.Parameters)
            .setLogicalId(logicalId)
            .setPropertyPath(propertyPath ?? ['Parameters', logicalId]);
    }

    static output(text: string, logicalId: string, propertyPath?: (string | number)[]): ContextExpectationBuilder {
        return new ContextExpectationBuilder(text)
            .setTopLevel(false)
            .setSection(TopLevelSection.Outputs)
            .setLogicalId(logicalId)
            .setPropertyPath(propertyPath ?? ['Outputs', logicalId]);
    }

    static condition(text: string, logicalId: string, propertyPath?: (string | number)[]): ContextExpectationBuilder {
        return new ContextExpectationBuilder(text)
            .setTopLevel(false)
            .setSection(TopLevelSection.Conditions)
            .setLogicalId(logicalId)
            .setPropertyPath(propertyPath ?? ['Conditions', logicalId]);
    }

    static mapping(text: string, logicalId: string, propertyPath?: (string | number)[]): ContextExpectationBuilder {
        return new ContextExpectationBuilder(text)
            .setTopLevel(false)
            .setSection(TopLevelSection.Mappings)
            .setLogicalId(logicalId)
            .setPropertyPath(propertyPath ?? ['Mappings', logicalId]);
    }

    static intrinsicFunction(text: string): ContextExpectationBuilder {
        return new ContextExpectationBuilder(text).setIntrinsicFunc(true);
    }

    static pseudoParameter(text: string): ContextExpectationBuilder {
        return new ContextExpectationBuilder(text).setPseudoParameter(true);
    }

    setText(text: string): ContextExpectationBuilder {
        this.expectation.text = text;
        return this;
    }

    setTopLevel(isTopLevel: boolean): ContextExpectationBuilder {
        this.expectation.isTopLevel = isTopLevel;
        return this;
    }

    setSection(section?: SectionType): ContextExpectationBuilder {
        if (section !== undefined) {
            this.expectation.section = section;
        }
        return this;
    }

    setLogicalId(logicalId: string): ContextExpectationBuilder {
        this.expectation.logicalId = logicalId;
        return this;
    }

    setPropertyPath(propertyPath: (string | number)[]): ContextExpectationBuilder {
        this.expectation.propertyPath = propertyPath;
        return this;
    }

    setEntitySection(entitySection: string | number): ContextExpectationBuilder {
        this.expectation.entitySection = entitySection;
        return this;
    }

    setResourceType(isResourceType: boolean): ContextExpectationBuilder {
        this.expectation.isResourceType = isResourceType;
        return this;
    }

    setIntrinsicFunc(isIntrinsicFunc: boolean): ContextExpectationBuilder {
        this.expectation.isIntrinsicFunc = isIntrinsicFunc;
        return this;
    }

    setPseudoParameter(isPseudoParameter: boolean): ContextExpectationBuilder {
        this.expectation.isPseudoParameter = isPseudoParameter;
        return this;
    }

    setResourceAttribute(isResourceAttribute: boolean): ContextExpectationBuilder {
        this.expectation.isResourceAttribute = isResourceAttribute;
        return this;
    }

    setEntityType(entityType: string): ContextExpectationBuilder {
        this.expectation.entityType = entityType;
        return this;
    }

    setEntityProperties(entityProperties: Record<string, any>): ContextExpectationBuilder {
        this.expectation.entityProperties = entityProperties;
        return this;
    }

    withEntity(entityType: string, entityProperties?: Record<string, any>): ContextExpectationBuilder {
        this.setEntityType(entityType);
        if (entityProperties !== undefined) {
            this.setEntityProperties(entityProperties);
        }
        return this;
    }

    withFlags(flags: {
        isResourceType?: boolean;
        isIntrinsicFunc?: boolean;
        isPseudoParameter?: boolean;
        isResourceAttribute?: boolean;
        isResourceProperty?: boolean;
    }): ContextExpectationBuilder {
        if (flags.isResourceType !== undefined) {
            this.setResourceType(flags.isResourceType);
        }
        if (flags.isIntrinsicFunc !== undefined) {
            this.setIntrinsicFunc(flags.isIntrinsicFunc);
        }
        if (flags.isPseudoParameter !== undefined) {
            this.setPseudoParameter(flags.isPseudoParameter);
        }
        if (flags.isResourceAttribute !== undefined) {
            this.setResourceAttribute(flags.isResourceAttribute);
        }
        return this;
    }

    todo(comment: string): ContextExpectationBuilder {
        this.expectation.todo = true;
        this.expectation.todoComment = comment;
        return this;
    }

    // Build method to return the final expectation
    build(): ContextExpectation {
        return { ...this.expectation };
    }
}

export class HoverExpectationBuilder {
    private readonly expectation: HoverExpectation = new HoverExpectation();

    static create(): HoverExpectationBuilder {
        return new HoverExpectationBuilder();
    }

    expectContent(content: string | undefined): HoverExpectationBuilder {
        this.expectation.content = content;
        return this;
    }

    expectContainsText(texts: string[]): HoverExpectationBuilder {
        this.expectation.containsText = texts;
        return this;
    }

    expectExcludesText(texts: string[]): HoverExpectationBuilder {
        this.expectation.excludesText = texts;
        return this;
    }

    expectEmpty(): HoverExpectationBuilder {
        this.expectation.isEmpty = true;
        return this;
    }

    expectUndefined(): HoverExpectationBuilder {
        this.expectation.isUndefined = true;
        return this;
    }

    expectMatchesRegex(regex: RegExp): HoverExpectationBuilder {
        this.expectation.matchesRegex = regex;
        return this;
    }

    expectMinLength(length: number): HoverExpectationBuilder {
        this.expectation.minLength = length;
        return this;
    }

    expectMaxLength(length: number): HoverExpectationBuilder {
        this.expectation.maxLength = length;
        return this;
    }

    expectStartsWith(text: string): HoverExpectationBuilder {
        this.expectation.startsWith = text;
        return this;
    }

    expectEndsWith(text: string): HoverExpectationBuilder {
        this.expectation.endsWith = text;
        return this;
    }

    todo(comment: string): HoverExpectationBuilder {
        this.expectation.todo = true;
        this.expectation.todoComment = comment;
        return this;
    }

    build(): HoverExpectation {
        return this.expectation;
    }
}

export class CompletionExpectationBuilder {
    private readonly expectation: CompletionExpectation = new CompletionExpectation();

    static create(): CompletionExpectationBuilder {
        return new CompletionExpectationBuilder();
    }

    expectItems(items: string[]): CompletionExpectationBuilder {
        this.expectation.items = items;
        return this;
    }

    expectMinItems(count: number): CompletionExpectationBuilder {
        this.expectation.minItems = count;
        return this;
    }

    expectMaxItems(count: number): CompletionExpectationBuilder {
        this.expectation.maxItems = count;
        return this;
    }

    expectContainsItems(items: string[]): CompletionExpectationBuilder {
        this.expectation.containsItems = items;
        return this;
    }

    expectExcludesItems(items: string[]): CompletionExpectationBuilder {
        this.expectation.excludesItems = items;
        return this;
    }

    expectIncomplete(isIncomplete: boolean): CompletionExpectationBuilder {
        this.expectation.isIncomplete = isIncomplete;
        return this;
    }

    expectItemDetails(details: CompletionExpectation['itemDetails']): CompletionExpectationBuilder {
        this.expectation.itemDetails = details;
        return this;
    }

    todo(comment: string): CompletionExpectationBuilder {
        this.expectation.todo = true;
        this.expectation.todoComment = comment;
        return this;
    }

    build(): CompletionExpectation {
        return this.expectation;
    }
}
