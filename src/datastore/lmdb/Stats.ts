import { Database, RootDatabase } from 'lmdb';

export function stats(store: RootDatabase | Database): StoreStatsType {
    const stats = store.getStats() as Record<string, number>;
    const pageSize = stats['pageSize'];
    const branchPages = stats['treeBranchPageCount'];
    const leafPages = stats['treeLeafPageCount'];
    const overflowPages = stats['overflowPages'];

    return {
        totalSize: (branchPages + leafPages + overflowPages) * pageSize,
        maxSize: stats['mapSize'],
        entries: stats['entryCount'],
        maxReaders: stats['maxReaders'],
        numReaders: stats['numReaders'],
        branchPages,
        leafPages,
        overflowPages,
    };
}

export type StoreStatsType = {
    totalSize: number;
    maxSize: number;
    entries: number;
    maxReaders: number; // The configured maximum number of concurrent reader slots
    numReaders: number; // The number of reader slots currently in use
    branchPages: number; // An internal node in the B+ tree that contains keys and pointers to other pages, guiding search operations.
    leafPages: number; // A terminal node in the B+ tree where the actual key-value pairs are stored.
    overflowPages: number; // A separate page used to hold a value that is too large to fit on its corresponding leaf page.
};
