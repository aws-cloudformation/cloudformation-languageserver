# Telemetry

## Why We Collect Telemetry

The CloudFormation Language Server collects anonymous usage metrics using OpenTelemetry, the industry-standard observability framework, to ensure we provide a near real-time experience. Language servers must deliver suggestions quickly and accurately to avoid interrupting your workflow. These metrics help us:

* Measure response times for autocomplete, validation, and hover documentation
* Understand the quality and relevance of suggestions we provide
* Detect performance degradation that impacts your editing experience
* Identify errors that prevent features from working correctly

Without telemetry, we cannot determine if suggestions appear fast enough or if the language server is meeting the performance expectations of a real-time editing experience.

## What We Collect

We collect anonymous operational metrics including:

* **Performance data**: Response times for autocomplete, validation, and hover documentation (in milliseconds)
* **Usage counts**: Number of times you use specific features
* **Error information**: Exception types and volume
* **System information**: Operating system type, LSP client version, Node.js version
* **Session identifier**: A unique ID that tracks your session without identifying you personally

### Metrics Metadata

Every metric includes the following metadata attributes:

| Attribute | Description | Example                                                    |
|---|---|------------------------------------------------------------|
| `service` | Language server name and version | `aws-cloudformation-languageserver-1.2.3`                  |
| `service.env` | Node environment and AWS environment | `production-prod`                                          |
| `client.id` | Unique session identifier (UUID) | `1111-2222-3333-4444`                                      |
| `client.type` | LSP client name and version | `vscode-1.85.0`                                            |
| `machine.type` | OS type, platform, architecture, version | `Darwin-darwin-arm64-arm64-22.1.0`                         |
| `process.type` | Process platform and architecture | `darwin-arm64`                                             |
| `process.version` | Node.js and V8 versions | `node=22.18.0 v8=12.4.254.21-node.27 uv=1.51.0 modules=127` |
| `OTelLib` | Operation name | `Hover`, `AutoComplete`, etc.                              |

## How Data is Transmitted

* Metrics export every 30 seconds via HTTPS with TLS 1.2+ encryption
* Data is sent using the OpenTelemetry Protocol (OTLP) over HTTP

## How to Enable or Disable Telemetry

Telemetry is controlled by your LSP client via extend initialization options passed to the language server:

For example, 
```
...
initializationOptions: {
    aws: {
        clientInfo: {
            ....
        },
        telemetryEnabled: true/false,
    }
}
...
```

Your LSP client controls telemetry settings. Consult your LSP client's documentation for configuration options. Changes require restarting the language server to take effect.

* **Alpha environment**: Telemetry is enabled by default if no initialization parameter is provided
* **Beta and Production environments**: Telemetry is disabled by default if no initialization parameter is provided
