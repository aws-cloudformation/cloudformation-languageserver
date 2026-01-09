import { existsSync, mkdirSync, rmSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import { legacyPathToArtifact } from './ArtifactsDir'; // eslint-disable-line no-restricted-imports
import { ExtensionId } from './ExtensionConfig';

const AppName = ExtensionId;

/**
 * Manages the storage directory for language server artifacts (logs, caches, databases).
 * @example
 * // Initialize with default location
 * Storage.initialize();
 *
 * // Initialize with custom location
 * Storage.initialize('/custom/path');
 *
 * // Get path to storage root
 * const root = Storage.pathToStorage();
 *
 * // Get path to subdirectory (creates if needed)
 * const logsDir = Storage.pathToStorage('logs');
 */
export class Storage {
    private static root: string | undefined;

    /**
     * Initialize storage with optional custom directory. Must be called before pathToStorage().
     * Cleans up legacy storage location (.aws-cfn-storage) from previous versions.
     * @param storageDir Optional explicit storage directory path
     */
    static initialize(storageDir?: string): void {
        this.root = storageDir ?? this.getDefaultStorageRoot();
        this.cleanupLegacyStorage();
    }

    /**
     * Get absolute path to storage directory or subdirectory. Creates directory if it doesn't exist.
     * @param artifactDir Optional subdirectory name
     * @returns Absolute path to the storage location
     * @throws Error if initialize() has not been called
     */
    static pathToStorage(artifactDir?: string): string {
        if (this.root === undefined) {
            throw new Error('Storage directory not initialized');
        }
        const path = artifactDir ? join(this.root, artifactDir) : this.root;

        if (!existsSync(path)) {
            mkdirSync(path, { recursive: true });
        }

        return path;
    }

    /**
     * Storage location priority:
     * 1. Explicit path passed to initialize()
     * 2. CFN_LSP_STORAGE_DIR environment variable
     * 3. Platform-specific default:
     *    - Windows: %LOCALAPPDATA%\aws-cloudformation-languageserver
     *    - macOS: ~/Library/Application Support/aws-cloudformation-languageserver
     *    - Linux: $XDG_STATE_HOME/aws-cloudformation-languageserver (or ~/.local/state/...)
     */
    private static getDefaultStorageRoot(): string {
        if (process.env.CFN_LSP_STORAGE_DIR) {
            return process.env.CFN_LSP_STORAGE_DIR;
        }

        switch (platform()) {
            case 'win32': {
                return join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), AppName);
            }
            case 'darwin': {
                return join(homedir(), 'Library', 'Application Support', AppName);
            }
            default: {
                return join(process.env.XDG_STATE_HOME ?? join(homedir(), '.local', 'state'), AppName);
            }
        }
    }

    private static cleanupLegacyStorage(): void {
        const legacyPath = legacyPathToArtifact();
        if (existsSync(legacyPath)) {
            rmSync(legacyPath, { recursive: true, force: true });
        }
    }
}

/**
 * Convenience function for Storage.pathToStorage()
 * @param artifactDir Optional subdirectory name
 */
export function pathToStorage(artifactDir?: string): string {
    return Storage.pathToStorage(artifactDir);
}
