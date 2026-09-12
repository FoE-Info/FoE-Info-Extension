#!/usr/bin/env node

/**
 * PreToolUse Safety Gate Hook
 * Blocks or asks for confirmation before executing destructive commands.
 */

import { fileURLToPath } from 'node:url';

export const DANGEROUS_PATTERNS = [
  /git\s+reset\s+.*(--hard|--merge)/i,
  /git\s+push\s+.*(--force|-f)\b/i,
  /git\s+clean\s+.*-[a-z]*f/i,
  /git\s+restore\s+.*([.]|\*|src(\/|$))/i,
  /git\s+checkout\s+.*((-f|--force)\b|(--\s+)?[.](?:\s|$))/i,
  /git\s+branch\s+.*(-[dD]|--delete)\s+(refs\/heads\/)?development\b/i,
  /git\s+push\s+.*--delete\s+(?:refs\/heads\/)?development\b/i,
  /git\s+push\s+.*\s:(?:refs\/heads\/)?development\b/i,
  /git\s+stash\s+(drop|clear)\b/i,
  /rm\s+(-[a-z]*r[a-z]*f[a-z]*|-[a-z]*f[a-z]*r[a-z]*|-r\s+-f|-f\s+-r)\s+.*(src|\.agents|tests|\/|\*|\.\/)/i,
  /\bfoe-browser\b/i,
  /\b(pkill|killall)\s+.*chrome/i,
];

export function isDangerousCommand(cmd) {
  if (!cmd || typeof cmd !== 'string') return false;
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(cmd));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let input = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk) => {
    input += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const payload = JSON.parse(input || '{}');
      const toolCall = payload.toolCall || {};

      if (toolCall.name === 'run_command') {
        const cmd = toolCall.args?.CommandLine || '';
        if (isDangerousCommand(cmd)) {
          const response = {
            decision: 'force_ask',
            reason: `Potentially destructive command detected: "${cmd}". User confirmation required.`,
          };
          process.stdout.write(JSON.stringify(response));
          return;
        }
      }

      process.stdout.write(JSON.stringify({ decision: 'allow' }));
    } catch {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
    }
  });
}
