# Antigravity Hook Safety Recipes

Production-tested patterns from the FoE-Info Extension repository.

---

## 1. Safety Gate (`PreToolUse`)

Intercept destructive commands before terminal execution:

```javascript
// scripts/safety-gate.mjs
process.stdin.on('end', () => {
  const { toolCall } = JSON.parse(input);
  const cmd = toolCall?.args?.CommandLine || '';
  const isDestructive = /(rm -rf|git reset --hard|DROP TABLE)/i.test(cmd);

  const response = isDestructive
    ? { decision: 'force_ask', reason: `Destructive command detected: "${cmd}"` }
    : { decision: 'allow' };

  process.stdout.write(JSON.stringify(response));
});
```

---

## 2. Guardrail Reminder (`PreInvocation`)

Inject ephemeral context before every model invocation without dirtying chat history:

```javascript
// scripts/pre-invocation-reminder.mjs
process.stdin.on('end', () => {
  const response = {
    injectSteps: [
      {
        ephemeralMessage: 'Guardrail Reminder: Keep slices <= 100 lines, files <= 600 lines.'
      }
    ]
  };
  process.stdout.write(JSON.stringify(response));
});
```

---

## 3. Background Sync (`PostToolUse`)

Trigger non-blocking background tasks after file edits:

```javascript
// scripts/post-tool-graphify-sync.mjs
import { spawn } from 'node:child_process';

process.stdin.on('end', () => {
  // Spawn detached process so hook exits instantly
  const child = spawn('npm', ['run', 'graph:foe-info:update'], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  // Return required empty JSON immediately
  process.stdout.write(JSON.stringify({}));
});
```

---

## 4. Stop Guard (`Stop`)

Prevent premature agent exit while background tasks are active:

```javascript
// scripts/stop-guard.mjs
process.stdin.on('end', () => {
  const { fullyIdle, terminationReason } = JSON.parse(input);

  if (terminationReason === 'model_stop' && !fullyIdle) {
    process.stdout.write(JSON.stringify({
      decision: 'continue',
      reason: 'Background tasks are still actively executing. Please wait.'
    }));
    return;
  }

  process.stdout.write(JSON.stringify({ decision: 'allow' }));
});
```
