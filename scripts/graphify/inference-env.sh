#!/bin/sh
# Shared inference policy. No model startup, teardown, or stdout side effects.
# Autodetection prefers these providers over OpenAI even with a local base URL.
unset MOONSHOT_API_KEY ANTHROPIC_API_KEY
unset DEEPSEEK_API_KEY AZURE_OPENAI_API_KEY AZURE_OPENAI_ENDPOINT
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy
export NO_PROXY='*' no_proxy='*'
export OPENAI_BASE_URL='http://127.0.0.1:8080/v1'
export OPENAI_API_KEY='local'
export GRAPHIFY_BACKEND='openai'
export OPENAI_MODEL='qwen2.5vl:7b'
export GRAPHIFY_OPENAI_MODEL='qwen2.5vl:7b'
export GRAPHIFY_NO_TIPS=1
export RAMALAMA_MODEL='qwen2.5vl:7b'
export RAMALAMA_PORT='8080'
export RAMALAMA_CONTAINER_NAME='graphify-model'
export RAMALAMA_CTX_SIZE='32768'
export GRAPHIFY_MAX_OUTPUT_TOKENS='8192'
export RAMALAMA_START_TIMEOUT='120'
