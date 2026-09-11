import path from 'node:path';
import {
  isBroadSourceSearch,
  isCodebaseSourceSearch,
  isQueryStampFresh,
  touchQueryStamp,
} from '../../.agents/scripts/graphify-guard.mjs';

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../..',
);

export const GRAPHIFY_QUERY_TOOLS =
  /^graphify-(foe-info|foe-info-original|forge-hammer|metadata-store)_(query_graph|get_node|get_neighbors|shortest_path|god_nodes|get_community|graph_stats)$/;

export function isBroadSourceSearchTool(tool, args = {}) {
  const resolve = (p) =>
    path.resolve(root, String(p ?? '')).replace(/\\/g, '/');
  if (tool === 'grep') {
    return isCodebaseSourceSearch('grep_search', {
      SearchPath: resolve(args.path),
    });
  }
  if (tool === 'glob') {
    return isCodebaseSourceSearch('find_by_name', {
      SearchDirectory: resolve(args.path),
    });
  }
  return false;
}

export const GraphifyGuard = async () => {
  return {
    'tool.execute.after': async (input) => {
      if (GRAPHIFY_QUERY_TOOLS.test(input.tool)) touchQueryStamp();
    },
    'tool.execute.before': async (input, output) => {
      const broad =
        input.tool === 'bash' ?
          isBroadSourceSearch(output.args?.command ?? '')
        : isBroadSourceSearchTool(input.tool, output.args ?? {});
      if (broad && !isQueryStampFresh(1800)) {
        throw new Error(
          'Query Graphify before a broad source search (no query stamp within 1800 seconds). ' +
            'Use a graphify-* MCP query tool (query_graph / get_node / get_neighbors / shortest_path / graph_stats) or `graphify query "..."` first. ' +
            'Targeted file reads and file-scoped searches remain available.',
        );
      }
    },
  };
};
