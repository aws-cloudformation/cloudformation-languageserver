import Fuse, { IFuseOptions } from 'fuse.js';
import { CompletionItem, InsertTextFormat } from 'vscode-languageserver';

export type FuzzySearchFunction = (items: CompletionItem[], query: string) => CompletionItem[];

const DEFAULT_OPTIONS: IFuseOptions<CompletionItem> = {
    keys: [{ name: 'label', weight: 1 }],
    threshold: 0.5,
    distance: 20,
    minMatchCharLength: 1,
    shouldSort: true,
    ignoreLocation: false,
};

export function fuzzySearch(
    items: CompletionItem[],
    query: string,
    fuseOptions?: Partial<IFuseOptions<CompletionItem>>,
): CompletionItem[] {
    if (!query || query.trim().length === 0) {
        return items;
    }

    const fuse = new Fuse(items, fuseOptions);
    const results = fuse.search(query);

    return results.map((result, index) => {
        const item = result.item;
        item.sortText = index < 10 ? `0${index}` : String(index);
        item.preselect = index === 0;
        if (item.insertTextFormat !== InsertTextFormat.Snippet) {
            item.filterText = query;
        }

        return item;
    });
}

export function getFuzzySearchFunction(
    fuseOptions: Partial<IFuseOptions<CompletionItem>> = DEFAULT_OPTIONS,
): FuzzySearchFunction {
    return (items: CompletionItem[], query: string) => fuzzySearch(items, query, fuseOptions);
}
