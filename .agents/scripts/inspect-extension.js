#!/usr/bin/env node
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

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (!isNaN(parseInt(arg, 10))) {
    durationMs = parseInt(arg, 10);
  } else if (arg === '--all') {
    targetFilter = ''; // Include browser-internal targets too
  } else if (arg === '--target' && args[i + 1]) {
    targetFilter = args[++i];
  }
}

http.get('http://127.0.0.1:9222/json', (res) => {
  if (res.statusCode !== 200) {
    console.error(`[Error Inspector] CDP HTTP status ${res.statusCode}`);
    process.exitCode = 1;
    res.resume?.();
    return;
  }
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', async () => {
    let targets;
    try {
      targets = JSON.parse(body);
    } catch (e) {
      console.error('[Error Inspector] Failed to parse CDP targets JSON:', e.message);
      process.exitCode = 1;
      return;
    }

    // Filter targets
    let selectedTargets = targets.filter(t => {
      if (!t.webSocketDebuggerUrl) return false;
      // Exclude standard devtools internal pages unless explicitly targetFilter requested
      if (targetFilter === null && t.url && t.url.includes('devtools://devtools/bundled/devtools_app.html')) {
        return false;
      }
      if (targetFilter === null && t.url && t.url.includes('chrome://')) {
        return false;
      }
      if (targetFilter?.endsWith('.html')) {
        return t.url?.split(/[?#]/)[0].split('/').pop() === targetFilter;
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
      process.exitCode = 1;
      return;
    }

    console.log(`[Error Inspector] Monitoring ${selectedTargets.length} target(s) for ${durationMs}ms...`);
    selectedTargets.forEach(t => {
      const name = t.url ? (t.url.split('/').pop() || t.title) : t.title;
      console.log(` -> ${name} (${t.url})`);
    });

    const errorsCaptured = [];
    let confirmedTargets = 0;

    selectedTargets.forEach(target => {
      const targetName = target.url ? (target.url.includes('panel.html') ? 'panel.html' : target.url.split('/').pop().split('?')[0]) : target.title;
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      let monitoringEnded = false;
      const pending = new Set([1, 2]);
      const recordFailure = (text) => errorsCaptured.push({ target: targetName, type: 'CDP failure', text });

      ws.addEventListener('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Log.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      });

      ws.addEventListener('message', ({ data: msgStr }) => {
        try {
          const msg = JSON.parse(msgStr);
          if (pending.has(msg.id)) {
            if (msg.error) {
              recordFailure(msg.error.message || 'Subscription rejected');
            } else {
              pending.delete(msg.id);
              if (pending.size === 0) confirmedTargets++;
            }
          }
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
          } else if (msg.method === 'Log.entryAdded' && ['error', 'warning'].includes(msg.params.entry.level)) {
            errorsCaptured.push({
              target: targetName,
              type: `Log.${msg.params.entry.level}`,
              text: msg.params.entry.text,
              stack: ''
            });
          }
        } catch {
          // ignore parsing error
        }
      });

      ws.addEventListener('error', () => recordFailure('WebSocket connection failed'));
      ws.addEventListener('close', () => {
        if (!monitoringEnded) recordFailure('WebSocket closed before monitoring completed');
      });

      setTimeout(() => {
        monitoringEnded = true;
        if (pending.size > 0) recordFailure('CDP subscriptions were not confirmed');
        try {
          ws.close();
        } catch {
          // ignore close error
        }
      }, durationMs);
    });

    setTimeout(() => {
      console.log(`\n=================== BROWSER & EXTENSION CONSOLE REPORT ===================`);
      if (errorsCaptured.length === 0 && confirmedTargets === selectedTargets.length) {
        console.log(`0 errors/warnings captured across ${selectedTargets.length} target(s) during ${durationMs}ms window.`);
      } else {
        process.exitCode = 1;
        console.log(`FOUND ${errorsCaptured.length} ISSUE(S):`);
        errorsCaptured.forEach((err, idx) => {
          console.log(`\n[#${idx + 1}] [Target: ${err.target}] ${err.type}: ${err.text}`);
          if (err.stack) console.log(err.stack);
        });
      }
      console.log(`=========================================================================\n`);
    }, durationMs + 200);
  });
}).on('error', (err) => {
  console.error('[Error Inspector] CDP connection failed:', err.message);
  process.exitCode = 1;
}).setTimeout(5000, function () {
  this.destroy(new Error('CDP target discovery timed out'));
});
