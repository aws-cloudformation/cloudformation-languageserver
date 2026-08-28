import { afterEach, describe, expect, test, vi } from 'vitest';
import { CompletionItem, CompletionItemKind } from 'vscode-languageserver';
import { ScopedTelemetry } from '../../../src/telemetry/ScopedTelemetry';
import { getFuzzySearchFunction, MAX_FUZZY_QUERY_LENGTH } from '../../../src/utils/FuzzySearchUtil';

function completionItems(...labels: string[]): CompletionItem[] {
    return labels.map((label) => ({ label, kind: CompletionItemKind.Class }));
}

describe('FuzzySearchUtil', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fuzzySearch', () => {
        const search = getFuzzySearchFunction();

        test('ranks matching items and marks the best match as preselected', () => {
            const result = search(completionItems('Resources', 'Parameters', 'Outputs'), 'Res');

            expect(result[0].label).toBe('Resources');
            expect(result[0].sortText).toBe('00');
            expect(result[0].preselect).toBe(true);
        });

        test('records query and candidate lengths separately', () => {
            const histogramSpy = vi.spyOn(ScopedTelemetry.prototype, 'histogram');

            search(completionItems('Resources', 'Parameters', 'Outputs'), 'Res');

            expect(histogramSpy).toHaveBeenCalledWith('search.query.length', 3);
            expect(histogramSpy).toHaveBeenCalledWith('search.items.length', 3);
        });

        test('returns items unchanged for an empty query', () => {
            const input = completionItems('Resources', 'Parameters');

            const result = search(input, '');

            expect(result).toBe(input);
            expect(result.every((item) => item.sortText === undefined)).toBe(true);
        });

        test('returns items unchanged for a whitespace-only query', () => {
            const input = completionItems('Resources', 'Parameters');

            const result = search(input, ' '.repeat(4));

            expect(result).toBe(input);
            expect(result.every((item) => item.sortText === undefined)).toBe(true);
        });

        test('skips the search and returns items unranked when the query exceeds the max length', () => {
            const countSpy = vi.spyOn(ScopedTelemetry.prototype, 'count');
            const input = completionItems('Resources', 'Parameters', 'Outputs');
            const oversizedQuery = 'a'.repeat(MAX_FUZZY_QUERY_LENGTH + 1);

            const result = search(input, oversizedQuery);

            expect(result).toBe(input);
            expect(result.every((item) => item.sortText === undefined && item.preselect === undefined)).toBe(true);
            expect(countSpy).toHaveBeenCalledWith('search.skipped', 1);
        });

        test('still performs the search for a query exactly at the max length', () => {
            const label = 'a'.repeat(MAX_FUZZY_QUERY_LENGTH);
            const input = completionItems(label, 'Parameters');
            const query = 'a'.repeat(MAX_FUZZY_QUERY_LENGTH);

            const result = search(input, query);

            const matched = result.find((item) => item.label === label);
            expect(matched?.sortText).toBe('00');
        });
    });
});
