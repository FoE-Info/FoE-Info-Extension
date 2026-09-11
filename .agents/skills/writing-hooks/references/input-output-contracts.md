# Antigravity Hook Input/Output Protocol Contracts

Technical specifications for JSON contracts passed over stdin and stdout.

---

## 1. Key Invariant: camelCase Protojson

All keys sent to stdin and expected on stdout must use **camelCase** (e.g. `conversationId`, `stepIdx`, `toolCall`, `injectSteps`, `ephemeralMessage`).

---

## 2. Event Contracts

### `PreToolUse`
- **stdin**: `{"toolCall": {"name": "run_command", "args": {"CommandLine": "..."}}, "stepIdx": 1, ...}`
- **stdout**:
  ```json
  {
    "decision": "allow",         // "allow" | "deny" | "ask" | "force_ask"
    "reason": "Safe command."
  }
  ```

### `PreInvocation`
- **stdin**: `{"invocationNum": 1, "conversationId": "...", ...}`
- **stdout**:
  ```json
  {
    "injectSteps": [
      {
        "ephemeralMessage": "Guardrail reminder text here."
      }
    ]
  }
  ```

### `PostToolUse`
- **stdin**: `{"stepIdx": 5, "error": "", ...}`
- **stdout**: `{}` (Empty JSON object expected).

### `Stop`
- **stdin**: `{"fullyIdle": false, "terminationReason": "model_stop", ...}`
- **stdout**:
  ```json
  {
    "decision": "continue",      // "continue" to block exit; anything else permits stop
    "reason": "Background tasks still active."
  }
  ```
