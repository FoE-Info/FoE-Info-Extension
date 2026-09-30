#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const GRAPH_ROOT = resolve(
  process.env.GRAPH_VIEW_ROOT || join(ROOT, 'graphify-out'),
);
const HOST = process.env.GRAPH_VIEW_HOST || '127.0.0.1';
const PORT = Number.parseInt(process.env.GRAPH_VIEW_PORT || '8765', 10);
const DEFAULT_FILE = 'graph.html';
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(
    `GRAPH_VIEW_PORT must be an integer from 1 to 65535; received ${process.env.GRAPH_VIEW_PORT}`,
  );
}

if (!existsSync(GRAPH_ROOT) || !statSync(GRAPH_ROOT).isDirectory()) {
  throw new Error(
    `Graph export directory not found: ${GRAPH_ROOT}. Run 'bash scripts/graphify/graphify.sh foe-info export html' first.`,
  );
}

if (!existsSync(join(GRAPH_ROOT, DEFAULT_FILE))) {
  throw new Error(
    `Graph viewer entry point not found: ${join(GRAPH_ROOT, DEFAULT_FILE)}. Run 'bash scripts/graphify/graphify.sh foe-info export html' first.`,
  );
}

function requestPath(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(requestUrl, 'http://localhost').pathname,
    );
  } catch {
    return null;
  }
  return pathname === '/' ? DEFAULT_FILE : pathname.replace(/^\/+/, '');
}

function sendError(response, statusCode, message) {
  const body = `${message}\n`;
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

export function createGraphServer() {
  return createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendError(response, 405, 'Method Not Allowed');
      return;
    }

    const requestedPath = requestPath(request.url || '/');
    if (!requestedPath) {
      sendError(response, 400, 'Bad Request');
      return;
    }

    const filePath = resolve(GRAPH_ROOT, normalize(requestedPath));
    if (
      filePath !== GRAPH_ROOT &&
      !filePath.startsWith(`${GRAPH_ROOT}${sep}`)
    ) {
      sendError(response, 403, 'Forbidden');
      return;
    }

    let fileStats;
    try {
      fileStats = statSync(filePath);
    } catch {
      sendError(response, 404, 'Not Found');
      return;
    }
    if (!fileStats.isFile()) {
      sendError(response, 404, 'Not Found');
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-cache',
      'Content-Length': fileStats.size,
      'Content-Type':
        MIME_TYPES[extname(filePath).toLowerCase()] ||
        'application/octet-stream',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createGraphServer();
  server.listen(PORT, HOST, () => {
    console.log(`Graph viewer: http://${HOST}:${PORT}/graph.html`);
    console.log(`Serving: ${GRAPH_ROOT}`);
    console.log('Press Ctrl+C to stop.');
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
