# AI Module

AI-powered CloudFormation assistance using LangChain and Model Context Protocol (MCP).

## LLM Configuration

Create `~/.aws/cloudformation-ide/llm-config.json` with your preferred provider settings:

### OpenAI
```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "temperature": 0.1,
  "apiKey": "sk-...",
  "baseURL": "https://api.openai.com/v1",
  "organization": "org-...",
  "maxTokens": 4096,
  "frequencyPenalty": 0,
  "presencePenalty": 0
}
```
**Reference**: [OpenAI LangChain Integration](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-openai) | [NPM Package](https://www.npmjs.com/package/@langchain/openai)

### Anthropic
```json
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.1,
  "apiKey": "sk-ant-...",
  "anthropicApiUrl": "https://api.anthropic.com",
  "maxTokens": 4096,
  "topP": 1,
  "topK": 40
}
```
**Reference**: [Anthropic LangChain Integration](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-anthropic) | [NPM Package](https://www.npmjs.com/package/@langchain/anthropic)

### AWS Bedrock
```json
{
  "provider": "bedrock",
  "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "temperature": 0.1,
  "region": "us-east-1",
  "maxTokens": 4096,
  "topP": 1,
  "credentials": {
    "accessKeyId": "AKIA...",
    "secretAccessKey": "...",
    "sessionToken": "..."
  }
}
```
**Reference**: [AWS LangChain Integration](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-aws) | [NPM Package](https://www.npmjs.com/package/@langchain/aws)

### Google Vertex AI
```json
{
  "provider": "google-vertexai",
  "model": "gemini-1.5-pro",
  "temperature": 0.1,
  "projectId": "your-project-id",
  "location": "us-central1",
  "maxTokens": 4096,
  "topP": 1,
  "topK": 40
}
```
**Reference**: [Google Vertex AI LangChain Integration](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-google-vertexai) | [NPM Package](https://www.npmjs.com/package/@langchain/google-vertexai)

### Google GenAI
```json
{
  "provider": "google-genai",
  "model": "gemini-1.5-pro",
  "temperature": 0.1,
  "apiKey": "AIza...",
  "maxTokens": 4096,
  "topP": 1,
  "topK": 40
}
```
**Reference**: [Google GenAI LangChain Integration](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-google-genai) | [NPM Package](https://www.npmjs.com/package/@langchain/google-genai)

### Ollama
```json
{
  "provider": "ollama",
  "model": "llama3.2",
  "temperature": 0.1,
  "baseUrl": "http://localhost:11434",
  "maxTokens": 4096,
  "frequencyPenalty": 0,
  "presencePenalty": 0,
  "numCtx": 4096,
  "numGpu": 1,
  "numThread": 8,
  "repeatLastN": 64,
  "repeatPenalty": 1.1,
  "tfsZ": 1,
  "seed": 42
}
```
**Reference**: [Ollama LangChain Integration](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-ollama) | [NPM Package](https://www.npmjs.com/package/@langchain/ollama)

### Cohere
```json
{
  "provider": "cohere",
  "model": "command-r-plus",
  "temperature": 0.1,
  "apiKey": "...",
  "maxTokens": 4096
}
```
**Reference**: [Cohere LangChain Integration](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-cohere) | [NPM Package](https://www.npmjs.com/package/@langchain/cohere)

## MCP (Model Context Protocol)

The system automatically configures two MCP servers. For more information about MCP, see the [AWS MCP Documentation](https://awslabs.github.io/mcp/).

### Setup
1. Install [uv](https://docs.astral.sh/uv/getting-started/installation/)
2. Install Python using `uv` -> `uv python install 3.10`

### CloudFormation MCP Server
- **Command**: `uvx awslabs.cfn-mcp-server@latest`
- **Purpose**: Provides CloudFormation-specific tools and resources
- **Environment**: Uses your AWS profile and region settings

### AWS Knowledge MCP Server
- **URL**: `https://knowledge-mcp.global.api.aws`
- **Purpose**: Provides access to AWS documentation and knowledge base

MCP servers are managed automatically based on your AWS profile configuration. No manual setup required.

## Common Parameters

All providers support these base parameters:
- `model`: Model identifier (required)
- `temperature`: Randomness (0-2, default: 0.1)
- `maxTokens`: Maximum output tokens (optional)
- `topP`: Nucleus sampling (0-1, optional)
- `topK`: Top-k sampling (positive integer, optional)

Provider-specific parameters are documented in their respective LangChain integration repositories linked above.
