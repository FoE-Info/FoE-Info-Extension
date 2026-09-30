# Derived exports

The wrapper's full export set is optional:

```bash
bash scripts/graphify/graphify.sh foe-info export-all
```

It emits wiki, Obsidian, SVG, HTML, and tree in separate native calls. Native
clustering and labeling may also regenerate HTML without the full export set.

Generate one format with native `export`:

```bash
bash scripts/graphify/graphify.sh foe-info export html
bash scripts/graphify/graphify.sh foe-info export svg
bash scripts/graphify/graphify.sh foe-info export callflow-html --lang en
bash scripts/graphify/graphify.sh foe-info tree
```

Use `--help` and installed CLI source for format-specific options. The SVG
exporter requires the explicitly declared scipy dependency. Shared artifact
policy is owned by CONTRIBUTING.md; generated exports are not independent
sources of architectural truth. For MCP use the repository-generated profile,
not an interpreter path copied from `.graphify_python`.
