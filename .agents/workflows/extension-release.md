# Chrome Extension Release Workflow

Standard workflow for creating release bundles for Chrome WebStore submission.

## Steps

1. **Verify Clean Workspace**:
   Ensure `npm run check` passes cleanly without errors.

2. **Generate Release Package**:
   ```bash
   npm run build
   ```

3. **Verify Output Bundle**:
   - Production distribution files compiled in `build/FoE-Info_WEBSTORE/`.
   - Release ZIP generated in `build/FoE-Info_WEBSTORE.zip`.
