import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { Context } from '../context/Context';
import { Entity } from '../context/semantic/Entity';
import { EntityType } from '../context/semantic/SemanticTypes';
import { FuzzySearchFunction, getFuzzySearchFunction } from '../utils/FuzzySearchUtil';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem } from './CompletionUtils';

/* eslint-disable no-restricted-syntax -- Entire class depends on Entity */
export class EntityFieldCompletionProvider<T extends Entity> implements CompletionProvider {
    public getCompletions(context: Context, _: CompletionParams): CompletionItem[] {
        // Extract the actual entity (handle both regular and ForEach resources)
        const entity = context.getResourceEntity() as unknown as T;
        if (!entity) {
            return [];
        }

        const items = this.getFieldsAsCompletionItems(entity);
        if (context.text.length > 0) {
            const fsFunc = entityFieldFuzzySearchFuncMap.get(entity.entityType);
            return fsFunc ? fsFunc(items, context.text) : items;
        }
        return items;
    }

    private getFieldsAsCompletionItems(entity: T): CompletionItem[] {
        const fields: Array<string> = [];
        for (const key of entity.keys) {
            if (entity[key as keyof T] === undefined) {
                fields.push(key);
            }
        }

        return fields.map((f) =>
            createCompletionItem(f, CompletionItemKind.Property, {
                sortText: entityFieldSortTextFuncMap.get(entity.entityType)?.(f),
            }),
        );
    }
}

const entityFieldFuzzySearchFuncMap: ReadonlyMap<EntityType, FuzzySearchFunction> = new Map([
    [
        EntityType.Parameter,
        getFuzzySearchFunction({
            keys: [{ name: 'label', weight: 1 }],
            // match 10 chars away (0.5 * 20) and suggest ConstraintDescription when 'description' is typed
            threshold: 0.5,
            distance: 20,
            minMatchCharLength: 1,
            shouldSort: true,
            ignoreLocation: false,
        }),
    ],
    [
        EntityType.Output,
        getFuzzySearchFunction({
            keys: [{ name: 'label', weight: 1 }],
            threshold: 0.5,
            distance: 3,
            minMatchCharLength: 1,
            shouldSort: true,
            ignoreLocation: false,
        }),
    ],
    [
        EntityType.Resource,
        getFuzzySearchFunction({
            keys: [{ name: 'label', weight: 1 }],
            threshold: 0.8,
            distance: 3,
            minMatchCharLength: 1,
            shouldSort: true,
            ignoreLocation: false,
        }),
    ],
]);

type EntityFieldSortTextFunc = (label: string) => string;

const entityFieldSortTextFuncMap: ReadonlyMap<EntityType, EntityFieldSortTextFunc> = new Map([
    [
        EntityType.Parameter,
        (label: string) => {
            if (label === 'Type') {
                return '0Type';
            }
            return label;
        },
    ],
    [
        EntityType.Output,
        (label: string) => {
            switch (label) {
                case 'Value': {
                    return '0Value';
                }
                case 'Description': {
                    return '0Description';
                }
                default: {
                    return label;
                }
            }
        },
    ],
    [
        EntityType.Resource,
        (label: string) => {
            switch (label) {
                case 'Type': {
                    return '0Type';
                }
                case 'Properties': {
                    return '1Properties';
                }
                default: {
                    return `9${label}`;
                }
            }
        },
    ],
]);
