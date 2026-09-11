#!/usr/bin/env node
const path = require('path');
let WebSocket;
try {
  WebSocket = require('ws');
} catch {
  WebSocket = globalThis.WebSocket;
}
const http = require('http');

// Parse args
const args = process.argv.slice(2);
let durationMs = 3000;
let targetFilter = null; // null means all extension & game targets
let showAll = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!isNaN(parseInt(arg, 10))) {
    durationMs = parseInt(arg, 10);
  } else if (arg === '--all') {
    showAll = true;
  } else if (arg === '--target' && args[i + 1]) {
    targetFilter = args[++i];
  }
}

http.get('http://127.0.0.1:9222/json', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', async () => {
    let targets = [];
    try {
      targets = JSON.parse(body);
    } catch (e) {
      console.error('[Error Inspector] Failed to parse CDP targets JSON:', e.message);
      process.exit(1);
    }

    // Filter targets
    let selectedTargets = targets.filter(t => {
      if (!t.webSocketDebuggerUrl) return false;
      // Exclude standard devtools internal pages unless explicitly targetFilter requested
      if (!targetFilter && t.url && t.url.includes('devtools://devtools/bundled/devtools_app.html')) {
        return false;
      }
      if (!targetFilter && t.url && t.url.includes('chrome://')) {
        return false;
      }
      if (targetFilter) {
        return (t.url && t.url.includes(targetFilter)) || (t.title && t.title.toLowerCase().includes(targetFilter.toLowerCase()));
      }
      return true;
    });

    if (selectedTargets.length === 0) {
      console.error('[Error Inspector] No matching targets found in Chrome!');
      console.log('Available targets:');
      targets.forEach(t => console.log(` - [${t.type}] ${t.title} (${t.url})`));
      process.exit(1);
    }

    console.log(`[Error Inspector] Monitoring ${selectedTargets.length} target(s) for ${durationMs}ms...`);
    selectedTargets.forEach(t => {
      const name = t.url ? (t.url.split('/').pop() || t.title) : t.title;
      console.log(` -> ${name} (${t.url})`);
    });

    const errorsCaptured = [];
    let pendingSockets = selectedTargets.length;

    selectedTargets.forEach(target => {
      const targetName = target.url ? (target.url.includes('panel.html') ? 'panel.html' : target.url.split('/').pop().split('?')[0]) : target.title;
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      let msgId = 1;

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: msgId++, method: 'Log.enable' }));
        ws.send(JSON.stringify({ id: msgId++, method: 'Runtime.enable' }));
      });

      ws.on('message', (msgStr) => {
        try {
          const msg = JSON.parse(msgStr);
          if (msg.method === 'Runtime.exceptionThrown') {
            const details = msg.params.exceptionDetails;
            const text = details.exception ? (details.exception.description || details.exception.value) : details.text;
            const stack = details.stackTrace ? details.stackTrace.callFrames.map(f => `  at ${f.functionName || '<anonymous>'} (${f.url}:${f.lineNumber}:${f.columnNumber})`).join('\n') : '';
            errorsCaptured.push({
              target: targetName,
              type: 'Uncaught Exception',
              text: text,
              stack: stack
            });
          } else if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
            const argsText = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
            const stack = msg.params.stackTrace ? msg.params.stackTrace.callFrames.map(f => `  at ${f.functionName || '<anonymous>'} (${f.url}:${f.lineNumber}:${f.columnNumber})`).join('\n') : '';
            errorsCaptured.push({
              target: targetName,
              type: `Console.${msg.params.type}`,
              text: argsText,
              stack: stack
            });
          } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
            errorsCaptured.push({
              target: targetName,
              type: 'Log Error',
              text: msg.params.entry.text,
              stack: ''
            });
          }
        } catch {
          // ignore parsing error
        }
      });

      ws.on('error', () => {
        // ignore socket error
      });

      setTimeout(() => {
        try {
          ws.close();
        } catch {
          // ignore close error
        }
      }, durationMs);
    });

    setTimeout(() => {
      console.log(`\n=================== BROWSER & EXTENSION CONSOLE REPORT ===================`);
      if (errorsCaptured.length === 0) {
        console.log(`0 errors/warnings captured across ${selectedTargets.length} target(s) during ${durationMs}ms window.`);
      } else {
        console.log(`FOUND ${errorsCaptured.length} ISSUE(S):`);
        errorsCaptured.forEach((err, idx) => {
          console.log(`\n[#${idx + 1}] [Target: ${err.target}] ${err.type}: ${err.text}`);
          if (err.stack) console.log(err.stack);
        });
      }
      console.log(`=========================================================================\n`);
    }, durationMs + 200);
  });
});
