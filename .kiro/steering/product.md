# Product Overview

The AWS CloudFormation Language Server provides intelligent editing support for CloudFormation templates in JSON and YAML. It implements the Language Server Protocol (LSP) to deliver auto-completion, validation, navigation, and refactoring capabilities to any compatible editor.

## Target Users

- Developers writing CloudFormation Infrastructure as Code templates
- Teams using VS Code, JetBrains IDEs, Neovim, Emacs, or other LSP-compatible editors

## Key Features

- **Code Completion** — Resource types, properties, intrinsic functions, parameters, references
- **Validation** — Syntax, schema, cfn-lint, AWS Guard
- **Code Actions** — Quick fixes, extract to parameter, related resources
- **Documentation** — Hover docs, go-to-definition, document symbols
- **AWS Integration** — Stack operations, resource discovery, template deployment
- **Code Lens** — Validate/deploy actions, open stack templates

## Distribution

The language server is bundled with the AWS Toolkit extensions for VS Code and JetBrains. Standalone editors use a direct installation.
