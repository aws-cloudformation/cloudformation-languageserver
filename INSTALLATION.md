# Standalone Installation Guide

This guide covers installing and configuring the CloudFormation Language Server for standalone editors.

> For [JetBrains](https://plugins.jetbrains.com/plugin/11349-aws-toolkit) and [Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=AmazonWebServices.aws-toolkit-vscode), the language server is bundled with the ***AWS Toolkit*** extension.

## Prerequisites

1. [Node.js](https://nodejs.org/en)

## Download

Download the latest release for your platform from [GitHub Releases](https://github.com/aws-cloudformation/cloudformation-languageserver/releases/latest).

### Available Builds

| Platform | Architecture | Node Version | Asset |
|----------|--------------|--------------|-------|
| macOS | ARM64 (Apple Silicon) | 22 | `cloudformation-languageserver-*-darwin-arm64-node22.zip` |
| macOS | x64 (Intel) | 22 | `cloudformation-languageserver-*-darwin-x64-node22.zip` |
| Linux | ARM64 | 22 | `cloudformation-languageserver-*-linux-arm64-node22.zip` |
| Linux | x64 | 22 | `cloudformation-languageserver-*-linux-x64-node22.zip` |
| Linux (glibc 2.28) | ARM64 | 18 | `cloudformation-languageserver-*-linuxglib2.28-arm64-node18.zip` |
| Linux (glibc 2.28) | x64 | 18 | `cloudformation-languageserver-*-linuxglib2.28-x64-node18.zip` |
| Windows | ARM64 | 22 | `cloudformation-languageserver-*-win32-arm64-node22.zip` |
| Windows | x64 | 22 | `cloudformation-languageserver-*-win32-x64-node22.zip` |

### Example: macOS ARM64

```bash
curl -L -o cfn-lsp.zip \
  https://github.com/aws-cloudformation/cloudformation-languageserver/releases/latest/download/cloudformation-languageserver-darwin-arm64-node22.zip

unzip cfn-lsp.zip -d /path/to/install-location
```

## Server Configuration

### Initialization Options

The language server accepts initialization options via the LSP `initialize` request:

```json
{
  "initializationOptions": {
    "aws": {
      "clientInfo": {
        "extension": {
          "name": "your-editor-name",
          "version": "1.0.0"
        }
      },
      "telemetryEnabled": true
    }
  }
}
```

| Option | Type              | Description |
|--------|-------------------|-------------|
| `aws.clientInfo.extension.name` | string            | Your editor/client name |
| `aws.clientInfo.extension.version` | string            | Your editor/client version |
| `aws.clientInfo.clientId` | string (optional) | Unique identifier for the client instance |
| `aws.telemetryEnabled` | boolean           | Enable anonymous usage metrics (default: `false`) |
| `aws.storageDir` | string (optional) | Custom directory for logs, caches, and databases. Defaults to platform-specific location (see below) |
| `aws.settings` | object (optional) | Settings overrides applied before workspace configuration sync. Useful for editors that don't support `workspace/configuration` reliably. See [Settings](#settings) below. |

For the full initialization options schema, see [`src/server/InitParams.ts`](src/server/InitParams.ts).

### Settings

The `aws.settings` object (and the `aws.cloudformation` workspace configuration) controls server behavior. All fields are optional with sensible defaults. For the complete schema and defaults, see [`src/settings/Settings.ts`](src/settings/Settings.ts).

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `profile.region` | string | `us-east-1` | AWS region for resource operations |
| `profile.profile` | string | `default` | AWS credentials profile name |

Example with profile and diagnostics customization:

```json
{
  "aws": {
    "settings": {
      "profile": {
        "region": "eu-west-1",
        "profile": "my-profile"
      },
      "diagnostics": {
        "cfnLint": {
          "ignoreChecks": ["E3012"]
        },
        "cfnGuard": {
          "enabledRulePacks": ["cis-aws-benchmark-level-1", "wa-Reliability-Pillar"]
        }
      }
    }
  }
}
```

#### Storage

If `aws.storageDir` is not specified, the server uses platform-specific defaults:

| Platform | Default Location |
|----------|------------------|
| macOS | `~/Library/Application Support/aws-cloudformation-languageserver` |
| Linux | `$XDG_STATE_HOME/aws-cloudformation-languageserver` (or `~/.local/state/...`) |
| Windows | `%LOCALAPPDATA%\aws-cloudformation-languageserver` |

You can also set the `CFN_LSP_STORAGE_DIR` environment variable to override the default location.

See [Telemetry](src/telemetry/README.md) for details on collected metrics.

### Supported File Types

- `yaml` - YAML CloudFormation templates
- `json` - JSON CloudFormation templates
- `cfn`, `template` - Custom CloudFormation template extensions

---

## Client Setup

### Neovim

```lua
local lspconfig = require("lspconfig")
local configs = require("lspconfig.configs")

if not configs.cfn_lsp then
  configs.cfn_lsp = {
    default_config = {
      cmd = { "node", "/path/to/install-location/cfn-lsp-server-standalone.js", "--stdio" },
      filetypes = { "yaml", "json" },
      root_dir = function(fname)
        return lspconfig.util.root_pattern(".git", "package.json")(fname) or vim.fn.getcwd()
      end,
      init_options = {
        aws = {
          clientInfo = {
            extension = { name = "neovim", version = vim.version().major .. "." .. vim.version().minor },
            clientId = vim.fn.hostname(),
          },
          telemetryEnabled = true,
        },
      },
    },
  }
end

lspconfig.cfn_lsp.setup({})
```

Verify: Open a YAML/JSON file and run `:LspInfo`

### Kiro CLI

[Kiro CLI](https://kiro.dev/docs/cli/) supports [custom language servers](https://kiro.dev/docs/cli/code-intelligence/#custom-language-servers) via its LSP integration. To configure the CloudFormation Language Server:

1. Run `/code init` in your project root (if not already initialized)

2. Edit the generated `lsp.json` (located at `.kiro/settings/lsp.json`) and add the `cloudformation` entry:

```json
{
  "languages": {
    "cloudformation": {
      "name": "cloudformation-languageserver",
      "command": "node",
      "args": ["/path/to/install-location/cfn-lsp-server-standalone.js", "--stdio"],
      "file_extensions": ["json", "yaml", "yml", "cfn", "template"],
      "project_patterns": [],
      "exclude_patterns": [],
      "multi_workspace": false,
      "initialization_options": {
        "aws": {
          "clientInfo": {
            "extension": {
              "name": "kiro-cli",
              "version": "1.0.0"
            }
          },
          "telemetryEnabled": true
        }
      },
      "request_timeout_secs": 60
    }
  }
}
```

3. Restart Kiro CLI to load the new configuration, or run `/code init -f` to force re-initialization

Verify: Run `/code status` to confirm the `cloudformation` server is initialized.

### Sublime Text (LSP package)

Add to LSP settings:

```json
{
  "clients": {
    "cfn-lsp": {
      "enabled": true,
      "command": ["node", "/path/to/install-location/cfn-lsp-server-standalone.js", "--stdio"],
      "selector": "source.yaml | source.json",
      "initializationOptions": {
        "aws": {
          "clientInfo": {
            "extension": { "name": "sublime", "version": "4.0" },
            "clientId": "sublime-client"
          },
          "telemetryEnabled": true
        }
      }
    }
  }
}
```
