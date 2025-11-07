# Telemetry

The CloudFormation Language Server collects anonymous usage metrics (telemetry) using OpenTelemetry, the industry-standard observability framework, to measure and maintain real-time performance. 
Language servers must deliver suggestions quickly to avoid interrupting your workflow.

Telemetry enablement is controlled by your LSP client via initialization options passed to the language server, see [Enable or Disable Telemetry](#enable-or-disable-telemetry) for details.
The CloudFormation Language Server environment you use will determine the default telemetry collection behaviour:
* Alpha - Telemetry is enabled by default if no initialization parameter is provided
* Beta and Prod - Telemetry is disabled by default if no initialization parameter is provided

## What We Collect
Language servers must deliver suggestions quickly and accurately to avoid interrupting your workflow. These metrics help us:
* Measure response time: How long an operation took to complete (hover, autocomplete, go-to, etc.)
* Understand the quality and relevance of suggestions we provide
* Usage metrics: Invocation counts for operations
* Error metrics: Fault counts when operations fail
* Response metrics: Type and size of data returned by operations
    * Primitive data types only, actual data is not recorded
* System Information: Operating system, LSP client version, Node.js version
    * Does the hardware impact customer experience?
* Detect performance degradations that impacts the authoring experience

Without telemetry, we cannot objectively evaluate if suggestions are accurate or if the language server is meeting the performance expectations of a real-time authoring experience.

### Metrics Metadata
Every metric includes the following metadata attributes:

| Attribute | Description                                       | Example                                                     |
|---|---------------------------------------------------|-------------------------------------------------------------|
| `service` | Language server name and version                  | `aws-cloudformation-languageserver-1.2.3`                   |
| `service.env` | Node environment and AWS environment              | `production-prod`                                           |
| `client.id` | Unique session identifier (UUID)                  | `1111-2222-3333-4444`                                       |
| `client.type` | LSP client name and version                       | `vscode-1.85.0`                                             |
| `machine.type` | OS type, platform, architecture, version          | `Darwin-darwin-arm64-arm64-22.1.0`                          |
| `process.type` | Process platform and architecture                 | `darwin-arm64`                                              |
| `process.version` | Node.js and V8 versions                           | `node=22.18.0 v8=12.4.254.21-node.27 uv=1.51.0 modules=127` |
| `OTelLib` | Operation name                                    | `Hover`, `Completion`, etc.                                 |
| `HandlerSource` | Request handler that initiated an operation       | `Document.Open`, `Stack.List`, `Resource.Search`, etc.      |
| `RequestId` | Random unique identifier for each request (UUID) | `5555-6666-7777-8888`                                       |

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