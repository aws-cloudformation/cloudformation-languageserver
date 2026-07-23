# AWS Toolkit JetBrains Plugin + Local CloudFormation LSP: Build & Run Runbook

How to build the AWS Toolkit JetBrains plugin from local sources, install it by disk, and point it at a locally-built CloudFormation language server via the `__CLOUDFORMATIONLSP_PATH` environment variable.

**Repos:**

- Plugin: `aws-toolkit-jetbrains` (branch `main` + uncommitted CFN LSP changes)
- Server: `cloudformation-languageserver`

## Prerequisites

| Requirement | Version/Details | Evidence |
|-------------|-----------------|----------|
| Java | 21 (Corretto recommended) | `CONTRIBUTING.md` lines 28-29 |
| Gradle | 9.6.1 (bundled wrapper) | `gradle/wrapper/gradle-wrapper.properties` |
| Node.js | ^22.15.0 | `cloudformation-languageserver/package.json` engines |
| npm | >=10.5.0 | `cloudformation-languageserver/package.json` engines |
| .NET 6 | For Rider support only (optional) | `CONTRIBUTING.md` lines 31-37 |

---

## Step 1: Build the CloudFormation Language Server Bundle

The plugin expects the file `cfn-lsp-server-standalone.js` in the directory pointed to by `__CLOUDFORMATIONLSP_PATH`.

**Source evidence:** `CfnLspServerConfig.kt` (line 7):

```kotlin
const val SERVER_FILE = "cfn-lsp-server-standalone.js"
```

### Build Commands

```bash
cd cloudformation-languageserver

# Install dependencies
npm ci

# For DEVELOPMENT bundle (faster build, source maps, uses node_modules as externals):
npm run bundle

# For PRODUCTION bundle (minified, standalone node_modules):
npm run bundle:prod
```

**Source evidence:** `package.json` scripts:

```json
"bundle": "rm -rf out && webpack --env mode=development && npm run build:go:dev",
"bundle:prod": "rm -rf out && webpack --env mode=production --env env=prod",
```

### Output Locations

| Build Type | Output Directory | Evidence |
|------------|------------------|----------|
| Development | `bundle/development/` | `webpack.config.js`: `outputPath = resolve(join(__dirname, 'bundle', mode))` |
| Production | `bundle/production/` | Same |

---

## Step 2: Build the Toolkit Plugin Distribution

### Gradle Command

```bash
cd aws-toolkit-jetbrains

./gradlew :plugin-toolkit:intellij-standalone:buildPlugin
```

**Source evidence:** `CONTRIBUTING.md` (lines 46-47):

> For example, `./gradlew :plugin-toolkit:intellij-standalone:buildPlugin` will produce a plugin zip under `plugins/toolkit/intellij-standalone/build/distributions`.

### Output Location

```
plugins/toolkit/intellij-standalone/build/distributions/aws-toolkit-jetbrains-standalone-<version>.zip
```

### Target Platform Version

The build targets **IntelliJ 2025.3** (platform version 253).

**Source evidence:** `gradle.properties` (line 9): `ideProfileName=2025.3`

**Important:** The CFN LSP code (including the `__CLOUDFORMATIONLSP_PATH` override) lives in the `src-253+/` source set, so the feature requires IntelliJ 2025.3+.

---

## Step 3: Install the Plugin from Disk

### Pre-installation

1. **Uninstall the marketplace version first** (if installed):
   - Settings/Preferences → Plugins → "AWS Toolkit" (Installed tab) → gear icon → Uninstall
   - Restart IDE

### Installation

1. Open IntelliJ IDEA (**2025.3 or later**)
2. **Settings/Preferences** → **Plugins**
3. Gear icon → **Install Plugin from Disk...**
4. Select the zip from `plugins/toolkit/intellij-standalone/build/distributions/`
5. **OK** → **Restart IDE**

---

## Step 4: Configure the Local Language Server Path

The environment variable is `__CLOUDFORMATIONLSP_PATH` (double underscore prefix). It must point to the **directory** containing `cfn-lsp-server-standalone.js`, not the file itself.

**Source evidence:** `CfnLspServerSupportProvider.kt` — `resolveServerPath()`:

```kotlin
private fun resolveServerPath(): Path {
    val envPath = System.getenv("__CLOUDFORMATIONLSP_PATH")
    if (!envPath.isNullOrBlank()) {
        val serverFile = Path.of(envPath).resolve(CfnLspServerConfig.SERVER_FILE)
        if (Files.exists(serverFile)) {
            LOG.info { "Using local CloudFormation LSP from __CLOUDFORMATIONLSP_PATH: $serverFile" }
            return serverFile
        }
        LOG.warn { "__CLOUDFORMATIONLSP_PATH set but server not found at: $serverFile" }
    }
    return installer.getServerPath()
}
```

```bash
# Production bundle:
export __CLOUDFORMATIONLSP_PATH="$HOME/workplace_2/toolkit-both-clients/cloudformation-languageserver/bundle/production"

# OR development bundle:
export __CLOUDFORMATIONLSP_PATH="$HOME/workplace_2/toolkit-both-clients/cloudformation-languageserver/bundle/development"
```

---

## Step 5: Making macOS GUI-Launched IntelliJ See the Environment Variable

macOS GUI apps launched from Finder, Spotlight, or the Dock do **not** inherit shell environment variables from `.zshrc`/`.bashrc`.

### Option A: Launch from Terminal (recommended for dev)

```bash
__CLOUDFORMATIONLSP_PATH="/path/to/bundle/production" open -na "IntelliJ IDEA.app"

# Or with the idea CLI launcher if configured:
__CLOUDFORMATIONLSP_PATH="/path/to/bundle/production" idea
```

Note: `open -a` alone may not always inherit the current shell's env; `-n` forces a new instance.

### Option B: `launchctl setenv` (system-wide for GUI apps)

```bash
# Persists until reboot/logout
launchctl setenv __CLOUDFORMATIONLSP_PATH "/path/to/bundle/production"
```

Restart IntelliJ afterwards. To persist across reboots, use a LaunchAgent plist.

### Option C: Gradle `runIde` Task (best for iterating on the plugin)

Runs the plugin in a sandbox IDE with full control over the environment:

```bash
cd aws-toolkit-jetbrains

__CLOUDFORMATIONLSP_PATH="/path/to/bundle/production" \
  ./gradlew :plugin-toolkit:intellij-standalone:runIde -PrunIdeVariant=IU
```

**Source evidence:** `CONTRIBUTING.md` (lines 87-99) documents the runIde variants: `-PrunIdeVariant=IC` (Community), `IU` (Ultimate), `RD` (Rider).

---

## Step 6: Verify the Local Server Is in Use

### Check the IDE Log

Log locations (`CONTRIBUTING.md` lines 138-141):

```
# Sandbox IDE (runIde):
plugins/toolkit/intellij-standalone/build/idea-sandbox/system/log/idea.log

# Real installed IDE (macOS):
~/Library/Logs/JetBrains/IntelliJIdea<version>/idea.log
```

Look for:

```
Using local CloudFormation LSP from __CLOUDFORMATIONLSP_PATH: .../bundle/production/cfn-lsp-server-standalone.js
```

### Enable DEBUG Logging (optional)

Help → Debug Log Settings → add `software.aws.toolkits`. (Debug logs may contain sensitive information.)

---

## Step 7: Development Workflow — Rebuilding After Changes

### After modifying the language server

```bash
cd cloudformation-languageserver
npm run bundle   # or npm run bundle:prod

# Restart IntelliJ (or close/reopen a CFN template file) —
# the plugin spawns a new LSP process on the next CFN file open
```

### After modifying the plugin

```bash
cd aws-toolkit-jetbrains

# Iterate in the sandbox:
__CLOUDFORMATIONLSP_PATH="..." ./gradlew :plugin-toolkit:intellij-standalone:runIde -PrunIdeVariant=IU

# Or rebuild the zip for installation:
./gradlew :plugin-toolkit:intellij-standalone:buildPlugin
```

---

## Gotchas & Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Gradle version errors | Project requires Gradle 9.6.1 | Always use the bundled `./gradlew` wrapper |
| Java errors | Java 21 required | Install Corretto 21 / set `JAVA_HOME` |
| CodeArtifact errors | Build may reference `CODEARTIFACT_URL`/`CODEARTIFACT_AUTH_TOKEN` | Usually optional for OSS builds; only needed if errors mention CodeArtifact |
| Plugin loads but no CFN LSP | `src-253+` source set requires platform 253+ | Use IntelliJ 2025.3 or later |
| Env var not seen | macOS GUI apps don't inherit shell env | Use `launchctl setenv` or launch from terminal |
| "server not found at" warning in log | Path doesn't contain `cfn-lsp-server-standalone.js` | Point at the **directory**, not the file |
| Sandbox vs real IDE confusion | Different log/config paths | Sandbox under `build/idea-sandbox/`; real IDE under `~/Library/...` |
| Node.js not found | Plugin can't locate a Node runtime | Install Node 22+; optionally configure in Settings → AWS → CloudFormation |
| Multiple node processes | Shared-server mode may spawn a proxy | Check `~/.cfn-lsp/proxy.log`; disable shared server in settings if needed |

### Quick Verification

```bash
ls -la /path/to/cloudformation-languageserver/bundle/production/cfn-lsp-server-standalone.js
```

---

## Summary

| Step | Command / Action |
|------|------------------|
| 1. Build LSP | `cd cloudformation-languageserver && npm ci && npm run bundle` |
| 2. Build plugin | `cd aws-toolkit-jetbrains && ./gradlew :plugin-toolkit:intellij-standalone:buildPlugin` |
| 3. Install plugin | Settings → Plugins → gear → Install Plugin from Disk → select zip |
| 4. Set env var | `export __CLOUDFORMATIONLSP_PATH=".../bundle/production"` |
| 5. Launch IDE | From terminal, `launchctl setenv` + restart, or `runIde` |
| 6. Verify | `idea.log`: "Using local CloudFormation LSP from __CLOUDFORMATIONLSP_PATH" |
