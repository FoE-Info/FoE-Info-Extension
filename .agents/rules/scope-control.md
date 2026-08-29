# Rule: Scope Control & Package Management Best Practices

## 1. Strict Scope Boundaries

- Modify only the target files and configurations requested by the user.
- Do not modify external or third-party software configuration files.

## 2. No File Mutations on Question Prompts

- Respond to investigatory questions directly without mutating files.

## 3. Package Management with `uv`

- Prefer `uv tool install --force "package[extras]"` for existing CLI tools instead of cloning source repositories.
