# Offline Wheels for cfn-lint

This directory contains Python wheel files for cfn-lint and its dependencies, providing offline fallback support when internet connectivity is not available.

## How it works

The language server will automatically:
1. Try to install the latest cfn-lint from PyPI (when online)
2. Fall back to these bundled wheels (when offline or PyPI fails)

## Updating Wheels

To update the bundled wheels for a new release:

```bash
npm run download-wheels
```

This downloads the latest cfn-lint and dependencies, which should be committed to the repository.

## Files

- `*.whl` - Python wheel files (committed to repo for offline support)
- `README.md` - This documentation file
