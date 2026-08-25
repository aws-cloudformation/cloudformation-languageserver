import Fuse, { IFuseOptions } from 'fuse.js';
import { CompletionItem } from 'vscode-languageserver';
import { TelemetryService } from '../telemetry/TelemetryService';

// Fuse processes long patterns in 32-character chunks; this limits parser-derived input to eight chunks.
export const MAX_FUZZY_QUERY_LENGTH = 256;

function measureSearch<T>(fn: () => T): T {
    const telemetry = TelemetryService.instance.get('FuzzySearch');
    return telemetry.measure('search', fn);
}

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
    const telemetry = TelemetryService.instance.get('FuzzySearch');
    telemetry.histogram('search.query.length', query.length);
    telemetry.histogram('search.items.length', items.length);

    if (!query || query.trim().length === 0) {
        return items;
    }

    if (query.length > MAX_FUZZY_QUERY_LENGTH) {
        telemetry.count('search.skipped', 1);
        return items;
    }

    const fuse = new Fuse(items, fuseOptions);
    const results = measureSearch(() => fuse.search(query));

    return results.map((result, index) => {
        const item = result.item;
        item.sortText = index < 10 ? `0${index}` : String(index);
        item.preselect = index === 0;

        return item;
    });
}

export function getFuzzySearchFunction(
    fuseOptions: Partial<IFuseOptions<CompletionItem>> = DEFAULT_OPTIONS,
): FuzzySearchFunction {
    return (items: CompletionItem[], query: string) => fuzzySearch(items, query, fuseOptions);
}
