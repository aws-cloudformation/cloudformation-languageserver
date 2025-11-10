# Telemetry

The CloudFormation Language Server collects anonymous usage metrics (telemetry) using OpenTelemetry, the industry-standard observability framework, to measure and maintain real-time performance. 
Language servers must deliver suggestions quickly to avoid interrupting your workflow.

Telemetry enablement is controlled by your LSP client via initialization options passed to the language server, see [Enable or Disable Telemetry](#enable-or-disable-telemetry) for details.
The CloudFormation Language Server environment you use will determine the default telemetry collection behaviour:
* **Alpha** - Telemetry is enabled by default if no initialization parameter is provided
* **Beta and Prod** - Telemetry is disabled by default if no initialization parameter is provided

## What We Collect
The language server collects anonymous telemetry:
* **Performance Metrics** - Response time (latency) for operations
* **Usage Metrics** - Invocation counts for operations
* **Error Metrics** - Fault counts when operations fail, stack trace metadata: error type, file name, line number, column number
* **Response Metrics** - Data type (_primitives only_: string, number, boolean, object, array, etc.) and size
* **System Metrics** - CPU utilization, Memory utilization, process uptime
* **System Information**
    * Operating system type, platform, architecture, version
    * LSP client name and version
    * Node.js and V8 engine versions
    * Process platform and architecture 

## Why We Collect Telemetry
Language servers must deliver suggestions in real-time to avoid interrupting your workflow. Telemetry enables us to:
* Measure if operations meet real-time performance expectations
* Detect performance degradations before they impact the authoring experience
* Understand if suggestions are accurate and relevant
* Identify if hardware or environment impacts customer experience
* Make data-driven decisions on feature improvements

Without telemetry, we cannot objectively evaluate if the language server meets performance expectations or if suggestions help users author CloudFormation templates effectively.

### Metrics Metadata
Metrics includes the following metadata:

| Attribute | Description                                        | Example                                                     |
|---|----------------------------------------------------|-------------------------------------------------------------|
| `service` | Language server name and version                   | `aws-cloudformation-languageserver-1.2.3`                   |
| `service.env` | Node environment and AWS environment               | `production-prod`                                           |
| `client.id` | Unique client identifier (UUID)                    | `1111-2222-3333-4444`                                       |
| `client.type` | LSP client name and version                        | `vscode-1.85.0`                                             |
| `machine.type` | OS type, platform, architecture, version           | `Darwin-darwin-arm64-arm64-22.1.0`                          |
| `process.type` | Process platform and architecture                  | `darwin-arm64`                                              |
| `process.version` | Node.js and V8 versions                            | `node=22.18.0 v8=12.4.254.21-node.27 uv=1.51.0 modules=127` |
| `OTelLib` | Operation name                                     | `Hover`, `Completion`, etc.                                 |
| `HandlerSource` | Request handler that initiated an operation        | `Document.Open`, `Stack.List`, `Resource.Search`, etc.      |
| `RequestId` | Random unique identifier for each operation (UUID) | `5555-6666-7777-8888`                                       |

## Data Transmission
Metrics export every 30 seconds via HTTPS with TLS 1.2+ encryption using OpenTelemetry Protocol (OTLP).

## Enable or Disable Telemetry
Your LSP client (AWS ToolKit, VSCode, JetBrains, etc.) controls telemetry enablement via initialization options. For example:
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

Consult your LSP client's documentation for configuration options. Changes to telemetry enablement require restarting the language server to take effect.
