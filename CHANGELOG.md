# Changelog

All notable changes to the AWS CloudFormation Language Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1]

### Added
- **Language Server Protocol**: Full LSP implementation for CloudFormation templates with comprehensive language features
- **Intelligent Completion System**:
  - Advanced completion engine with fuzzy matching using Fuse.js
  - Resource type and property completion
  - Intrinsic function completion with parameter suggestions
  - Parameter type and value completion
  - Condition and mapping completion
  - Top-level section completion
- **Hover Documentation**: 
  - Contextual help for CloudFormation resources, properties, and intrinsic functions
  - Parameter documentation with type information
  - Condition and mapping hover support
  - Template section documentation
  - Pseudo-parameter reference information
- **Document Processing**:
  - Tree-sitter parsing for YAML and JSON CloudFormation templates
  - Partial JSON parsing for incomplete documents
  - CloudFormation template detection and validation
  - Document symbol extraction and indexing
  - Multi-format support (JSON/YAML)
- **Schema Validation**:
  - CloudFormation resource schema validation and enforcement
  - Regional schema support with automatic retrieval
  - Private and combined schema handling
  - Remote schema caching and management
- **AWS Service Integration**:
  - CloudFormation API integration for stack operations
  - IAM service integration for permission validation
- **Diagnostics and Validation**:
  - Real-time syntax and semantic validation
  - cfn-lint integration with Pyodide worker for Python-based linting
  - Comprehensive error detection and reporting
  - Code action suggestions for common issues
- **Navigation Features**:
  - Go-to-definition functionality for CloudFormation references
  - Document symbol support for template navigation
  - Context-aware entity resolution
