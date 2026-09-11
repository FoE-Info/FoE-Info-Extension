#!/bin/sh
# Shared inference policy. No model startup, teardown, or stdout side effects.
# Autodetection prefers these providers over OpenAI even with a local base URL.
unset GEMINI_API_KEY GOOGLE_API_KEY MOONSHOT_API_KEY ANTHROPIC_API_KEY
unset DEEPSEEK_API_KEY AZURE_OPENAI_API_KEY AZURE_OPENAI_ENDPOINT
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy
export NO_PROXY='*' no_proxy='*'
export OPENAI_BASE_URL='http://127.0.0.1:8081/v1'
export OPENAI_API_KEY='local'
export GRAPHIFY_BACKEND='openai'
export OPENAI_MODEL='qwen2.5-vl-7b'
export GRAPHIFY_OPENAI_MODEL='qwen2.5-vl-7b'
export GRAPHIFY_NO_TIPS=1
