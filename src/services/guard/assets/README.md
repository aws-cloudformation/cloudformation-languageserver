# Guard WASM Assets

This directory contains generated WebAssembly files for AWS CloudFormation Guard policy validation.

## Generated Files

The following files are **generated** and should not be edited manually:

- `guard.js` - JavaScript bindings for the WASM module
- `guard_bg.wasm` - WebAssembly binary
- `guard.d.ts` - TypeScript definitions
- `package.json` - Package metadata

## Building WASM Files

To generate these files, run:

```bash
npm run build:guard-wasm
```

This script:
1. Clones the [aws-cloudformation/cloudformation-guard](https://github.com/aws-cloudformation/cloudformation-guard) repository
2. Builds the WASM module from source
3. Copies the generated files to this directory

## Version

The WASM files are built from cfn-guard version specified in `tools/build-guard-wasm.ts`.

## Git Ignore

These generated files are ignored in `.gitignore` since they're build artifacts that can be regenerated as needed.