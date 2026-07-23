# AWS Toolkit VS Code + Local CloudFormation LSP: Build & Run Runbook

How to build the AWS Toolkit VS Code extension from local sources, install it by disk, and point it at a locally-built CloudFormation language server.

**Repos:**

- Extension: `aws-toolkit-vscode` (branch `master` + uncommitted CFN shared-server changes)
- Server: `cloudformation-languageserver`

## Part A: Environment Variable Override — Already Exists

**`__CLOUDFORMATIONLSP_PATH` already exists in the VS Code toolkit** (same convention as the JetBrains side).

**Evidence:**

1. `packages/core/src/awsService/cloudformation/extension.ts` (~lines 222-224):

   ```typescript
   const cfnLspConfig = {
       ...DevSettings.instance.getServiceConfig('cloudformationLsp', {}),
       ...getServiceEnvVarConfig('cloudformationLsp', ['path', 'cloudformationEndpoint']),
   }
   ```

2. `packages/core/src/shared/vscode/env.ts` — `getServiceEnvVarConfig()` converts config keys to env vars:
   - `path` → `__CLOUDFORMATIONLSP_PATH`
   - `cloudformationEndpoint` → `__CLOUDFORMATIONLSP_CLOUDFORMATION_ENDPOINT`

3. `CONTRIBUTING.md` (~lines 532-533) documents both variables.

4. `packages/core/src/awsService/cloudformation/lsp-server/settingsLspServerProvider.ts`:

   ```typescript
   async serverExecutable(): Promise<string> {
       const serverFile = join(this.path!, CfnLspServerFile)
       return Promise.resolve(serverFile)
   }
   ```

   where `CfnLspServerFile = 'cfn-lsp-server-standalone.js'` (from `lspServerConfig.ts`).

### Expected Value

`__CLOUDFORMATIONLSP_PATH` must point to a **directory** containing `cfn-lsp-server-standalone.js`, not the file itself:

```bash
export __CLOUDFORMATIONLSP_PATH=$HOME/workplace_2/toolkit-both-clients/cloudformation-languageserver/bundle/development
```

---

## Part B: Prerequisites and Install

### Node.js

- Language server requires Node.js `^22.15.0` (`cloudformation-languageserver/package.json` engines). Use Node 22.x.

```bash
nvm install 22 && nvm use 22
```

### Install dependencies

```bash
cd cloudformation-languageserver && npm install
cd aws-toolkit-vscode && npm install
```

---

## Part C: Build the CloudFormation Language Server

### Development build (recommended for testing)

```bash
cd cloudformation-languageserver
npm run bundle
```

Output: `bundle/development/cfn-lsp-server-standalone.js`. Development builds externalize dependencies to the repo's `node_modules` (so `npm install` must have run) and set `NODE_ENV=development`, `AWS_ENV=alpha`.

### Production build (fully bundled, self-contained)

```bash
npm run bundle:alpha   # alpha env
npm run bundle:beta    # beta env
npm run bundle:prod    # prod env
```

Output: `bundle/production/` including its own `node_modules/` with native binaries.

---

## Part D: Build and Package the Toolkit VSIX

```bash
cd aws-toolkit-vscode

# Compile only (no VSIX):
npm run compile

# Release VSIX (optimized):
npm run package

# Debug VSIX (unoptimized, faster):
npm run package -- --debug
```

The VSIX lands at the **repo root** (evidence: `scripts/package.ts` ~lines 163-166):

- Release: `aws-toolkit-vscode-{version}.vsix`
- Debug: `aws-toolkit-vscode-{version}-debug-g{commit}.vsix`

---

## Part E: Install the VSIX by Disk

### Extension ID conflict — uninstall marketplace version first

The local build shares the marketplace extension ID `amazonwebservices.aws-toolkit-vscode`:

```bash
code --uninstall-extension amazonwebservices.aws-toolkit-vscode
code --install-extension /path/to/aws-toolkit-vscode-*.vsix
```

Or via UI: Extensions panel → AWS Toolkit → gear → Uninstall/Disable, then Cmd+Shift+P → "Extensions: Install from VSIX...".

---

## Part F: Launch VS Code with the Local Server

### Env var route

GUI-launched VS Code on macOS does **not** inherit shell exports — launch `code` from a terminal that has the variable set:

```bash
export __CLOUDFORMATIONLSP_PATH=$HOME/workplace_2/toolkit-both-clients/cloudformation-languageserver/bundle/development
code
```

### Settings route (avoids the env problem entirely)

In user `settings.json` (macOS: `~/Library/Application Support/Code/User/settings.json`):

```json
{
  "aws.dev.cloudformationLsp.path": "/Users/you/.../cloudformation-languageserver/bundle/development"
}
```

The env var takes precedence if both are set.

---

## Part G: Verify the Local Server Is in Use

### VS Code Output channel

View → Output → select "AWS Toolkit" / "AWS CloudFormation". Look for:

```
[INFO] Found CloudFormation LSP executable: .../bundle/development/cfn-lsp-server-standalone.js
[INFO] Found CloudFormation LSP provider: SettingsLspServerProvider
```

(Evidence: `extension.ts`: `getLogger('awsCfnLsp').info('Found CloudFormation LSP executable: ...')`.)

### LSP server logs

```bash
ls -la ~/.aws-cfn-storage/logs/
tail -f ~/.aws-cfn-storage/logs/*.log
```

---

## Part H: F5 Extension-Host Debug (fastest iteration path)

Skip VSIX packaging entirely:

1. Open the workspace file `aws-toolkit-vscode.code-workspace`.
2. Provide the env var to the "Extension" launch config, either:
   - Edit `packages/toolkit/.vscode/launch.json` and add to its `env` block:

     ```json
     "__CLOUDFORMATIONLSP_PATH": "/Users/you/.../cloudformation-languageserver/bundle/development"
     ```

   - Or create `packages/toolkit/.local.env` (already referenced by the launch config via `"envFile": "${workspaceFolder}/.local.env"`):

     ```
     __CLOUDFORMATIONLSP_PATH=/Users/you/.../cloudformation-languageserver/bundle/development
     ```

3. Press **F5** → "Extension" configuration → a new VS Code window opens with the extension under the debugger.

Bonus: when running via F5 with `WEBPACK_DEVELOPER_SERVER` set, `DevLspServerProvider` auto-scans **sibling directories** for `bundle/development/cfn-lsp-server-standalone.js` (see `devLspServerProvider.ts` ~lines 46-68) — so a sibling checkout of the server repo may be picked up automatically.

---

## Summary

| Step | Command / Action | Result |
|------|------------------|--------|
| 1. Server deps | `cd cloudformation-languageserver && npm install` | `node_modules/` |
| 2. Build server | `npm run bundle` | `bundle/development/cfn-lsp-server-standalone.js` |
| 3. Toolkit deps | `cd aws-toolkit-vscode && npm install` | `node_modules/` |
| 4. Build VSIX | `npm run package -- --debug` | `aws-toolkit-vscode-*.vsix` at repo root |
| 5. Uninstall marketplace ext | `code --uninstall-extension amazonwebservices.aws-toolkit-vscode` | conflict avoided |
| 6. Install local VSIX | `code --install-extension aws-toolkit-vscode-*.vsix` | local build installed |
| 7. Set env & launch | `export __CLOUDFORMATIONLSP_PATH=.../bundle/development && code` | local LSP used |
| 8. Verify | Output → "Found CloudFormation LSP executable" | confirmed |

## Gotchas

1. **GUI-launched VS Code ignores shell exports** — launch from terminal, or use the `aws.dev.cloudformationLsp.path` setting.
2. **The env var points to a directory, not the .js file** — the toolkit appends `cfn-lsp-server-standalone.js`.
3. **Extension ID conflict** — uninstall/disable the marketplace AWS Toolkit first.
4. **Development server build uses the repo's `node_modules`** — run `npm install` in the server repo first.
5. **Production build is self-contained** — includes its own `node_modules/` with native binaries.
6. **F5 debug beats VSIX rebuilds** for iteration; `.local.env` keeps the override out of committed files.
