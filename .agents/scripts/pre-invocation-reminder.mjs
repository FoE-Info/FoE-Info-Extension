#!/usr/bin/env node

/**
 * PreInvocation Hook
 * Injects transient guardrail reminder for monolith containment and invariants.
 */

process.stdin.resume();
process.stdin.on('end', () => {
  const response = {
    injectSteps: [
      {
        ephemeralMessage:
          'FoE-Info Guardrail Reminder: Query Graphify first (call_mcp_tool graphify-foe-info:query_graph or CLI) before wide grep/file searches, proactively delegate domain tasks across the 31 specialized subagents via invoke_subagent (using Workspace: "share" for parallel feature work in isolated worktrees), keep changes in small slices (<100 lines), never add inline code directly to src/js/index.js, use BigNumber for all FP/GB math, ensure UI strings use data-i18n, NEVER pass ArtifactMetadata when writing repository files with write_to_file, and NEVER import or bundle offline metadata/JSON files into src/ (runtime is 100% dynamic network RPC).',
      },
    ],
  };
  process.stdout.write(JSON.stringify(response));
});
