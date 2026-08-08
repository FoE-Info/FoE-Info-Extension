# Advanced Agent Configuration Guide

This guide provides instructions on how to perform advanced configuration for
Google Antigravity SDK agents.

## Model Selection

### Default Model

Google Antigravity SDK's default model is `gemini-3.6-flash`.

### Default Image Generation Model

Google Antigravity SDK's default image generation model is `gemini-3.1-flash-lite-image`.

### Finding Valid Models

To find the most up-to-date list of valid Gemini model identifiers, refer to the
official documentation: -
[Google AI Studio Documentation](https://ai.google.dev/gemini-api/docs/models/gemini)

## CRITICAL RULE: Never Assume Valid Model Identifiers

> [!IMPORTANT] **Do not assume valid model identifiers.** Avoid guessing model
> names or assuming they follow a specific pattern. Always verify the valid
> identifiers from official documentation or user context before using them.

> [!IMPORTANT] **Avoid setting the model explicitly unless requested.** It is
> generally better to leave the model unset to use the default behavior, unless
> the user has explicitly requested a specific model.

## Advanced Configuration Examples

Here are small code snippets demonstrating advanced configurations using
`LocalAgentConfig`.

### Basic Configuration with Model Selection

```python
from google.antigravity import Agent, LocalAgentConfig

config = LocalAgentConfig(
    model="gemini-3.6-flash",
)
async with Agent(config=config) as agent:
    # Use the agent
    pass
```

### Gemini Enterprise Agent Platform (formerly Vertex AI) Configuration

To configure the agent to use Gemini Enterprise Agent Platform (formerly Vertex
AI) instead of Gemini Developer API:

```python
from google.antigravity import Agent, LocalAgentConfig

config = LocalAgentConfig(
    vertex=True,
    project="your-gcp-project",
    location="us-central1",
)
async with Agent(config=config) as agent:
    # Use the agent with Gemini Enterprise Agent Platform
    pass
```

Note: Gemini Enterprise Agent Platform authentication relies on Application
Default Credentials (ADC). Ensure you have run `gcloud auth application-default
login` in your environment.

### Prioritized Inference (`service_tier="priority"`)

To enable Gemini Prioritized Inference, manually construct a `GeminiAPIEndpoint`
or `VertexEndpoint` with `GeminiModelOptions`:

```python
from google.antigravity import (
    Agent,
    GeminiAPIEndpoint,
    LocalAgentConfig,
    types,
)

# Configure priority inference by manually constructing an endpoint.
options = types.GeminiModelOptions(service_tier=types.ServiceTier.PRIORITY)
endpoint = GeminiAPIEndpoint(options=options)
config = LocalAgentConfig(endpoint=endpoint)

async with Agent(config=config) as agent:
  response = await agent.chat("Explain quantum computing in one sentence.")

  # Inspect usage metadata to detect server-side rate limit downgrades.
  if (
      response.usage_metadata
      and response.usage_metadata.service_tier == types.ServiceTier.STANDARD
  ):
    print("Notice: Request was gracefully downgraded to standard tier.")
```

> [!IMPORTANT] **Pricing Notice:** Priority tier requests are billed at a higher
> rate than Standard tier requests. When overflow traffic is gracefully
> downgraded to Standard tier due to dynamic rate limiting, those downgraded
> requests are billed at standard rates. Please check the linked documentation
> for specific pricing, fallback thresholds, and feature details:
> [Gemini Priority Inference Documentation](https://ai.google.dev/gemini-api/docs/priority-inference).

### Application Data Directory Override (Artifact & Scratch Storage)

By default, the agent stores generated artifacts (like `task.md`), scratch
files, and uploaded media under `~/.gemini/antigravity/brain/`. You can override
this location by specifying an absolute path in `app_data_dir`:

```python
from google.antigravity import Agent, LocalAgentConfig

config = LocalAgentConfig(
    app_data_dir="/absolute/path/to/custom/storage",
)
async with Agent(config=config) as agent:
    # Generated files and artifacts will be written inside the custom directory
    pass
```

> [!IMPORTANT] **The path must be an absolute path.** Passing relative paths or
> unexpanded tildes (`~/`) will trigger a validation error.

### System Instructions and Personas

You can configure system instructions directly in the `LocalAgentConfig`:

```python
config = LocalAgentConfig(
    system_instructions="You are an expert software architect.",
)
```

For a more detailed guide and complex persona examples, see
[persona_config.md](../../examples/getting_started/persona_config.md).

### Custom Tools

You can add custom tools to your agent:

```python
from google.antigravity import Agent, LocalAgentConfig

config = LocalAgentConfig(
    tools=[my_custom_tool_function],
)
```

For a full guide on creating and using custom tools, see
[custom_tool.md](../../examples/getting_started/custom_tool.md).

### MCP Integration

To configure Model Context Protocol (MCP) servers:

```python
from google.antigravity import Agent, LocalAgentConfig, types

config = LocalAgentConfig(
    mcp_servers=[
        types.McpStreamableHttpServer(
            name="my_mcp_server",
            url="http://localhost:8080",
        )
    ],
)
```

For more details, see [mcp_integration.md](mcp_integration.md).

### Local Model Configuration

The SDK supports running agents entirely on-device without an API key. Two
additional config classes are available:

- `LiteRTAgentConfig`: For running Gemma models locally via LiteRT-LM.
- `LocalOpenAIAgentConfig`: For connecting to any OpenAI-compatible local
  server (e.g., Ollama, LM Studio).

For full setup instructions, hardware requirements, and configuration details,
see [local_models.md](local_models.md).

### Custom Environment Variables (Subprocess & Shell Isolation)

You can pass a custom dictionary of environment variables using `env` in `LocalAgentConfig`. These variables override any variables with the same name in the parent process's environment when launching `localharness` and are inherited by shell tool execution (`run_command`):

```python
from google.antigravity import Agent, LocalAgentConfig
import os

config = LocalAgentConfig(
    env={"PATH": "/custom/bin:" + os.environ.get("PATH", ""), "MY_CUSTOM_VAR": "foo"},
)
```
