# Standalone Installation Guide

This guide covers installing and configuring the CloudFormation Language Server for standalone editors.

> **Note**: For Visual Studio Code and JetBrains IDEs, the language server is bundled with the [AWS Toolkit](https://aws.amazon.com/visualstudio/) extensions.

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

### Running the Server

```bash
node /path/to/install-location/cfn-lsp-server-standalone.js --stdio
```

Communication options:
- `--stdio` - Use stdin/stdout (recommended)
- `--node-ipc` - Use Node IPC

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

See [Telemetry](src/telemetry/README.md) for details on collected metrics.

### Supported File Types

- `yaml` - YAML CloudFormation templates
- `json` - JSON CloudFormation templates
- `cfn`, `tempalte` - Custom CloudFormation template extensions

---

## Editor Setup

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
