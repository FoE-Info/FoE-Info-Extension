# Browser Debugging and Investigation

This guide owns procedures for attaching to a running browser and investigating live behavior. Follow the passive observation and privacy boundaries in [security architecture](security-architecture.md).

## 6. AI Pair-Debugging Workflow

When diagnosing behavior in a user's active session:

1. **Get permission for the specific attachment**: Read-only attachment permission does not include navigation, reload, login, tab creation/closure, or gameplay input. Ask separately before using a workflow that changes the game tab.
2. **Attach to the existing targets**: Reuse the user's current browser and game tab. Do not reload to make evidence easier to collect; a reload can lose the state being investigated.
3. **Arm every observation channel before the scenario**: On the game target and exposed FoE-Info extension targets (panel and service worker where available), enable CDP Network, Runtime and Log observation. Capture request/response events and available XHR/fetch bodies, WebSocket lifecycle and both frame directions, console messages, exceptions and log entries. `npm run browser:record -- brave 30` provides a bounded read-only stream to stdout. It does not persist captures.
4. **Coordinate a bounded observation window**: Confirm the listeners are armed before telling the operator it is ready. Capture all events from attachment through the agreed window; there is no action classifier or cross-run suppression. Do not wait indefinitely for an uncertain event. CDP cannot retrieve earlier traffic. If the operator says the action under investigation already finished, report the missing payload rather than asking them to repeat it solely for capture; continue with source or fixtures, or capture a later instance if the operator chooses.
5. **Inspect and sanitize**: Correlate the RPC envelope, raw resource IDs, extension logs and panel result. Filter after broad capture, not before. Treat raw payloads and URLs as private, and sanitize before sharing or saving them.

Enable FoE-Info's verbose debug mode through its panel only when its own logs are needed; it is supplementary and does not replace network, WebSocket or game-console capture. Use tags such as `[FoE-Info:RPC]` for analysis after the full capture is armed.

### Attaching to your running browser

The assistant attaches to the browser you are **already using**, on your main
profile, so extension storage (`chrome.storage.local`, world settings, and city
caches) stays shared. It never launches a second browser.

```bash
npm run browser:check    # is Brave / Chrome attachable right now?
npm run browser:attach -- --world=en7  # attach FoE-Info before opening en7 (or en16)
```

`scripts/lib/cdp.mjs` owns the transport. Browser server behavior affects
attachment and debugging:

- **Brave and Chrome expose different servers.** Brave is started by
  `--remote-debugging-port=9222` (in `~/.var/app/com.brave.Browser/config/brave-flags.conf`)
  and serves both `/json/version` discovery and the WebSocket endpoint. Chrome
  is started by the `chrome://inspect` toggle and serves the **WebSocket
  endpoint only**; its `/json/*` routes all return 404. That 404 looks exactly
  like "the server is not running", and it is not.
- **Chromium 136+ ignores `--remote-debugging-port` on a default
  user-data-dir.** That is why Chrome's port is chosen by the toggle (it is
  persisted per profile, not random) and cannot be pinned, while Brave's can.
  Adding the flag to Chrome also wedges its toggle at "starting…".

Both browsers need `--remote-allow-origins` in their `*-flags.conf`, or the
server answers 404 on discovery routes and 403 on the WebSocket upgrade. Flag
files are read at browser start, and the toggle is per-instance, so **restart
the browser after editing either one**.

`browser:attach` uses the running Brave instance and its default profile so
cookies, logins, and Forge-Hammer browser data stay together. It requires an
existing FoE tab, reuses that same tab, routes it to en0, opens DevTools, and
confirms that the FoE-Info view is attached. Only after confirmation does it
route the same tab to en7 or en16. If DevTools or the panel fails to attach, the
tab remains on en0. It never creates or closes tabs or launches another
profile. Ask the user before running it against their active browser because
the workflow intentionally changes that tab's page.

After setup, game telemetry is observed passively: no clicks, typing, game
requests, or gameplay automation. The setup navigation only loads the selected
world after the DevTools panel is confirmed.
