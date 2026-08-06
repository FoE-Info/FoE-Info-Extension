# Git Branching & Tooling Environment Rules

## Git & Branching Workflow

- **Development Branch (`development`)**: The primary development and integration branch is `development`. Do not commit directly to `development`. All feature work and bug fixes must fork off `development` in dedicated topic branches (e.g. `fix/<topic-name>` or `feat/<topic-name>`).
- **Branch Lifecycle**:
  1. **Create Branch BEFORE Editing**: Always run `git checkout development && git checkout -b fix/<topic-name>` prior to modifying any source files.
  2. Implement, verify, and commit changes with conventional commit messages (`fix(...)`, `feat(...)`).
  3. Merge back to `development`: `git checkout development && git merge fix/<topic-name>`.
  4. Clean up topic branch after merge: `git branch -d fix/<topic-name>`.

## Environment & Tooling Execution

- **Environment & Tool Managers**: Local project tools, PATH, and environment variables are automatically loaded via `.mise.toml`, `.envrc` (direnv), and `.env`.
- **Sandbox Execution**: Node, NPM, UV, and Mise are installed via Linuxbrew (`/var/home/linuxbrew/.linuxbrew/bin` and `/home/linuxbrew/.linuxbrew/bin`). When running shell commands, use `BypassSandbox: true` to access system Homebrew binaries seamlessly.
