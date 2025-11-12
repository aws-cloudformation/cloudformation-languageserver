# AWS CloudFormation Language Server

<div align="center">

[![build](https://github.com/aws-cloudformation/cloudformation-languageserver/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/aws-cloudformation/cloudformation-languageserver/actions/workflows/ci.yml)
&nbsp;
[![CodeQL](https://github.com/aws-cloudformation/cloudformation-languageserver/actions/workflows/github-code-scanning/codeql/badge.svg?branch=main)](https://github.com/aws-cloudformation/cloudformation-languageserver/actions/workflows/github-code-scanning/codeql)

</div>

The AWS CloudFormation Language Server provides auto-completion, validation, navigation, and refactoring for CloudFormation templates.
The server implements the Language Server Protocol (LSP) to enable code editors to offer intelligent editing support for JSON and YAML Infrastructure as Code templates.

## Features

### Code Completion
- **Resource Types** - Auto-completes AWS resource types with fuzzy matching
- **Properties** - Context-aware property suggestions for CloudFormation resources
- **Intrinsic Functions** - Function names and parameter suggestions
- **Parameters & References** - Template parameters, conditions, and mappings
- **Template Sections** - Top-level CloudFormation sections

### Validation
- **Syntax** - Immediate feedback on JSON and YAML syntax errors
- **Schema** - CloudFormation resource schema enforcement with regional support
- **cfn-lint** - Python-based linting with comprehensive rules
- **AWS Guard** - Policy-as-code validation for security and compliance

### Code Actions & Refactoring
- **Quick Fixes** - Fixes for common template errors
- **Extract to Parameter** - Refactors hardcoded values into template parameters
- **Related Resources** - Inserts related AWS resources based on template context
- **Diagnostic Actions** - Actionable suggestions for validation errors

### Documentation & Navigation
- **Hover Documentation** - Contextual help for resources, properties, and functions
- **Go-to-Definition** - Navigate to CloudFormation reference definitions
- **Document Symbols** - Template structure navigation and outline view
- **Parameter Information** - Type and constraint documentation

### AWS Integration
- **Stack Operations** - List and manage CloudFormation stacks
- **Resource Discovery** - Browse available AWS resource types by region
- **Template Validation** - Server-side template validation using CloudFormation
- **Template Deployment** - Deploy templates directly from the editor
- **Resource State Import** - Import existing AWS resources into templates
- **Clone Resource** - Create new resources using existing resource configurations as reference
- **IaC Generator** - Scan AWS accounts and generate CloudFormation templates from existing resources
- **Artifact Export** - Export and upload template artifacts to S3 for deployment

### Code Lens Actions
- **Validate and Deploy** - Deploy templates with a single click
- **Open Stack Template** - Open managed stack templates for resources

### Advanced Capabilities
- **Multi-Format Support** - JSON and YAML CloudFormation template processing
- **Partial Parsing** - Completion in incomplete or malformed templates
- **Regional Schemas** - Automatic schema retrieval and caching for different AWS regions
- **Tree-sitter Parsing** - Fast and accurate syntax parsing

## Telemetry

The CloudFormation Language Server collects anonymous usage metrics. See [Telemetry](src/telemetry/README.md) for details on what is collected and how to control telemetry settings.

## License

This project is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
