# Transcription scope

Audio and video are excluded from the shared extension graph by repository scope.
Transcription is not part of wrapper AST, update, or reindex maintenance. Do not
install transcription tools or dispatch media to a provider during a local graph
refresh. For an explicitly requested media corpus, inspect the installed package's
supported extraction dependencies and provider configuration, and keep its output
separate from the shared host graph.
