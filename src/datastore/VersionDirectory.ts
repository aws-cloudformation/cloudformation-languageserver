const VersionDirectoryPattern = /^v(\d+)$/;

/**
 * True only for a strict `v<number>` directory whose version is below {@link currentVersion}.
 *
 * Background cleanup runs from whichever binary happens to be executing, and an older binary must
 * never delete the store a newer binary is actively using. So this returns false for the current
 * version, any newer version, non-version names (markers, stray files, malformed names), and any
 * digit string too large to compare as a safe integer — leaving only strictly older stores eligible
 * for removal.
 */
export function isOlderVersionDirectory(directoryName: string, currentVersion: number): boolean {
    const match = VersionDirectoryPattern.exec(directoryName);
    if (match === null) {
        return false;
    }

    const version = Number(match[1]);
    if (!Number.isSafeInteger(version)) {
        return false;
    }

    return version < currentVersion;
}
