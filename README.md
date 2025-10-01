# AWS CloudFormation Language Server for Code Editors

<div align="center">

[![build](https://github.com/aws-cloudformation/cloudformation-languageserver/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/aws-cloudformation/cloudformation-languageserver/actions/workflows/ci.yml)
&nbsp;
[![CodeQL](https://github.com/aws-cloudformation/cloudformation-languageserver/actions/workflows/github-code-scanning/codeql/badge.svg?branch=main)](https://github.com/aws-cloudformation/cloudformation-languageserver/actions/workflows/github-code-scanning/codeql)

</div>

A LSP server implementation that provides intelligent editing support for CloudFormation templates in JSON and YAML formats.

## Features

### Intelligent Code Completion
- **Resource Types**: Auto-complete AWS resource types with fuzzy matching
- **Properties**: Context-aware property suggestions for CloudFormation resources
- **Intrinsic Functions**: Complete function names and parameter suggestions
- **Parameters & References**: Auto-complete template parameters, conditions, and mappings
- **Template Sections**: Top-level CloudFormation section completion

### Real-time Validation
- **Syntax Validation**: Immediate feedback on JSON/YAML syntax errors
- **Schema Validation**: CloudFormation resource schema enforcement with regional support
- **cfn-lint Integration**: Python-based linting with comprehensive rule validation
- **AWS Guard Integration**: Policy-as-code validation for security and compliance

### Documentation & Navigation
- **Hover Documentation**: Contextual help for resources, properties, and functions
- **Go-to-Definition**: Navigate to CloudFormation reference definitions
- **Document Symbols**: Template structure navigation and outline view
- **Parameter Information**: Type and constraint documentation

### AWS Integration
- **Stack Operations**: List and manage CloudFormation stacks
- **Resource Discovery**: Browse available AWS resource types by region
- **Template Validation**: Server-side CloudFormation template validation
- **Template Deployment**: Deploy templates directly from the editor
- **Resource State Import**: Import existing AWS resources into templates

### Advanced Capabilities
- **Multi-Format Support**: Native JSON and YAML CloudFormation template processing
- **Partial Parsing**: Intelligent completion even in incomplete or malformed templates
- **Regional Schemas**: Automatic schema retrieval and caching for different AWS regions

## Requirements

- **Node.js**: Version 22.15.0 to 22.17.0
- **npm**: Version 10.5.0 or higher

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
