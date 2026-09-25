import { createRequire } from 'module';

export type LmdbModule = typeof import('lmdb');

export type LmdbAvailability = { readonly available: true } | { readonly available: false; readonly cause: unknown };

/**
 * `lmdb` binds its native addon while the module is being evaluated, so a host without a usable prebuild
 * (a glibc older than the addon was linked against, an unsupported platform, a missing optional package)
 * fails on load rather than on the first `open()`. Every value import of `lmdb` goes through this loader
 * so that nothing pulls the addon in eagerly and {@link checkLmdbAvailability} can probe the host first.
 */
export function loadLmdbModule(): LmdbModule {
    const nodeRequire = createRequire(__filename);
    return nodeRequire('lmdb') as LmdbModule;
}

export function checkLmdbAvailability(load: () => unknown = loadLmdbModule): LmdbAvailability {
    try {
        load();
        return { available: true };
    } catch (cause) {
        return { available: false, cause };
    }
}
