---
type: "query"
date: "2026-09-27T14:09:20.154940+00:00"
question: "Is 'graphify reflect' additive, and is it safe to run when graphify-out/memory/ is empty?"
contributor: "graphify"
outcome: "corrected"
correction: "The skill presents reflect as a deterministic regeneration step with no warning that it is destructive. Treat it as a whole-file overwrite, not an append."
---

# Q: Is 'graphify reflect' additive, and is it safe to run when graphify-out/memory/ is empty?

## Answer

NO on both counts, and this destroyed data on 2026-09-27. 'reflect' regenerates LESSONS.md ENTIRELY from --memory-dir; it does not merge with or append to the existing file. Measured: LESSONS.md was 23k (last written 2026-09-24 21:40); after recording 7 memories and running reflect it is 2.7k, regenerated from those 7 alone. The prior 23k was unrecoverable — at the time of the loss graphify-out/ was gitignored in full (old .gitignore:42), and the graphify backup dirs (2026-09-26/, 2026-09-27/) contain only graph.json, .graphify_labels.json, .graphify_analysis.json, manifest.json and GRAPH_REPORT.md, never reflections/. The old content was unreproducible because the sessions that produced it could not have written memory/ (the MCP server does not record), so it must have been written by hand — which the maintain-graph-knowledge skill explicitly forbids. That gap is now closed: as of 2026-09-27 .gitignore tracks graphify-out/graph.json, graph.html, GRAPH_REPORT.md, memory/, reflections/ and findings/, so this class of loss cannot recur — the same loss would now be visible in git history. Durable decision knowledge was NOT lost in the first place: graphify-out/findings/decisions.jsonl and decisions.md and architecture_exploration_report.md are independent of reflect and intact. Safe procedure regardless: copy reflections/LESSONS.md aside before every reflect, and only run reflect after at least one save-result, or it will overwrite the file with an empty aggregation.

## Outcome

- Signal: corrected
- Correction: The skill presents reflect as a deterministic regeneration step with no warning that it is destructive. Treat it as a whole-file overwrite, not an append.