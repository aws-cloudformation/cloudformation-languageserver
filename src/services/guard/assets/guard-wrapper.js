/**
 * Wrapper for guard.js that fixes the WASM path resolution issue
 * in bundled environments where __dirname doesn't point to the assets directory
 */

const fs = require('fs');
const path = require('path');

// Store the original readFileSync to intercept WASM file reads
const originalReadFileSync = fs.readFileSync;

// Override readFileSync to fix the path for guard_bg.wasm
fs.readFileSync = function (filePath, options) {
    // If this is a request for guard_bg.wasm and the file doesn't exist at the given path
    if (typeof filePath === 'string' && filePath.endsWith('guard_bg.wasm') && !fs.existsSync(filePath)) {
        // Try to find it in the assets subdirectory
        const assetsPath = path.join(path.dirname(filePath), 'assets', 'guard_bg.wasm');
        if (fs.existsSync(assetsPath)) {
            return originalReadFileSync.call(this, assetsPath, options);
        }
    }

    // For all other files, use the original function
    return originalReadFileSync.call(this, filePath, options);
};

// Now require the actual guard.js
module.exports = require('./guard.js');
