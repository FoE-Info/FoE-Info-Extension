#!/usr/bin/env node

/**
 * End-to-end CDP test script to verify FoE-Info panel popover interactions:
 * 1. Hovering on player name does NOT trigger popover.
 * 2. Hovering on info/warning icon (#user) DOES trigger popover.
 * 3. Deleted players (#856168137 / notFound) are excluded from the ignore list popover.
 * 4. Daily FP and Guild Goods breakdown popovers render correctly.
 */

const CDP_HOST = process.env.CDP_HOST || '127.0.0.1';
const CDP_PORT = process.env.CDP_PORT || '9222';
const CDP_BASE = `http://${CDP_HOST}:${CDP_PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTargets() {
  const res = await fetch(`${CDP_BASE}/json`);
  if (!res.ok) throw new Error(`CDP HTTP error: ${res.status}`);
  return await res.json();
}

function sendCdp(wsUrl, method, params = {}, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error(`CDP '${method}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ws.onopen = () => ws.send(JSON.stringify({ id, method, params }));
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data.toString());
        if (data.id === id) {
          clearTimeout(timer);
          ws.close();
          resolve(data.result);
        }
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    };
    ws.onerror = (err) => {
      clearTimeout(timer);
      reject(err);
    };
  });
}

async function main() {
  console.log(
    `[test-panel-popovers] Connecting to Chromium CDP at ${CDP_BASE}...`,
  );
  const targets = await fetchTargets();

  const panel = targets.find((t) => t.url && t.url.includes('panel.html'));
  if (!panel || !panel.webSocketDebuggerUrl) {
    console.error(
      '[test-panel-popovers] FAIL: panel.html not found in CDP targets!',
    );
    process.exit(1);
  }

  console.log('1. Checking DOM structure of #citystats header...');
  const domCheck = await sendCdp(
    panel.webSocketDebuggerUrl,
    'Runtime.evaluate',
    {
      expression: `(() => {
      const card = document.getElementById('citystats');
      if (!card) return { found: false };
      const strong = card.querySelector('strong');
      const user = document.getElementById('user');
      const copyBtn = document.getElementById('citystats-copy-btn');

      return {
        found: true,
        strongText: strong?.textContent,
        strongHasPopover: strong?.hasAttribute('data-bs-toggle'),
        userHasPopover: user?.getAttribute('data-bs-toggle'),
        copyBtnText: copyBtn?.textContent
      };
    })()`,
      returnByValue: true,
    },
  );

  const dom = domCheck?.result?.value;
  console.log('DOM check:', JSON.stringify(dom, null, 2));
  if (!dom?.found) {
    console.error('[test-panel-popovers] FAIL: #citystats not found in panel');
    process.exit(1);
  }

  const hideAllPopoversExpr = `
    {
      const bs = window.bootstrap;
      document.querySelectorAll('[data-bs-toggle="popover"]').forEach((el) => {
        try {
          el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
          bs?.Popover?.getInstance(el)?.hide();
        } catch {}
      });
      await new Promise((r) => setTimeout(r, 100));
    }
  `;

  console.log(
    '2. Simulating hover on player name (should NOT trigger popover)...',
  );
  const hoverName = await sendCdp(
    panel.webSocketDebuggerUrl,
    'Runtime.evaluate',
    {
      expression: `(async () => {
      const strong = document.querySelector('#citystats strong');
      if (!strong) return { error: 'no strong' };
      ${hideAllPopoversExpr}

      strong.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      const popover = document.querySelector('.popover.show');
      return { popoverShownOnNameHover: popover !== null };
    })()`,
      awaitPromise: true,
      returnByValue: true,
    },
  );

  console.log('Hover on name result:', hoverName?.result?.value);
  if (hoverName?.result?.value?.popoverShownOnNameHover) {
    console.error(
      '[test-panel-popovers] FAIL: Popover was unexpectedly shown on player name hover!',
    );
    process.exit(1);
  }

  console.log(
    '3. Simulating hover on warning/info icon #user (SHOULD trigger popover)...',
  );
  const hoverIcon = await sendCdp(
    panel.webSocketDebuggerUrl,
    'Runtime.evaluate',
    {
      expression: `(async () => {
      const user = document.getElementById('user');
      if (!user) return { error: 'no user' };
      ${hideAllPopoversExpr}
      user.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      const popover = document.querySelector('.popover.show');
      const res = {
        popoverShownOnIconHover: popover !== null,
        popoverTitle: popover?.querySelector('.popover-header')?.textContent,
        popoverBody: popover?.querySelector('.popover-body')?.innerHTML?.slice(0, 300),
        hasDeletedId: popover?.textContent?.includes('856168137')
      };
      user.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      ${hideAllPopoversExpr}
      return res;
    })()`,
      awaitPromise: true,
      returnByValue: true,
    },
  );

  const iconResult = hoverIcon?.result?.value;
  console.log('Hover on icon result:', iconResult);
  if (!iconResult?.popoverShownOnIconHover) {
    console.error(
      '[test-panel-popovers] FAIL: Popover was not shown when hovering over #user icon!',
    );
    process.exit(1);
  }
  if (iconResult?.hasDeletedId) {
    console.error(
      '[test-panel-popovers] FAIL: Deleted player ID 856168137 was found in popover!',
    );
    process.exit(1);
  }

  console.log(
    '4. Testing label vs amount hover isolation (Daily and Guild Goods)...',
  );
  const labelIsolationCheck = await sendCdp(
    panel.webSocketDebuggerUrl,
    'Runtime.evaluate',
    {
      expression: `(async () => {
        ${hideAllPopoversExpr}

        const dailyLabel = document.querySelector('[data-i18n="daily"]');
        dailyLabel?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await new Promise(r => setTimeout(r, 150));
        const popoverAfterDaily = document.querySelector('.popover.show');

        const ggLabel = document.querySelector('[data-i18n="guildgoods"]');
        ggLabel?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await new Promise(r => setTimeout(r, 150));
        const popoverAfterGg = document.querySelector('.popover.show');

        return {
          dailyInTrigger: dailyLabel?.closest('#citystats-fp') !== null,
          ggInTrigger: ggLabel?.closest('#citystats-clan-goods') !== null,
          popoverOnDailyLabel: popoverAfterDaily !== null,
          popoverOnGgLabel: popoverAfterGg !== null
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    },
  );

  const labelResult = labelIsolationCheck?.result?.value;
  console.log('Label isolation result:', labelResult);
  if (labelResult?.dailyInTrigger || labelResult?.ggInTrigger) {
    console.error(
      '[test-panel-popovers] FAIL: Labels should not be inside popover trigger spans!',
    );
    process.exit(1);
  }
  if (labelResult?.popoverOnDailyLabel || labelResult?.popoverOnGgLabel) {
    console.error(
      '[test-panel-popovers] FAIL: Popover triggered when hovering over text labels!',
    );
    process.exit(1);
  }

  console.log('5. Testing Daily FP amount hover popover...');
  const fpPopoverCheck = await sendCdp(
    panel.webSocketDebuggerUrl,
    'Runtime.evaluate',
    {
      expression: `(async () => {
        ${hideAllPopoversExpr}

        const fpEl = document.getElementById('citystats-fp');
        if (!fpEl) return { found: false };
        fpEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        return new Promise((resolve) => {
          setTimeout(() => {
            const popover = document.querySelector('.popover.show');
            resolve({
              found: true,
              shown: popover !== null,
              title: popover?.querySelector('.popover-header')?.textContent
            });
          }, 200);
        });
      })()`,
      awaitPromise: true,
      returnByValue: true,
    },
  );

  console.log('Daily FP popover result:', fpPopoverCheck?.result?.value);
  if (!fpPopoverCheck?.result?.value?.shown) {
    console.error(
      '[test-panel-popovers] FAIL: Popover was not shown when hovering over Daily FP amount!',
    );
    process.exit(1);
  }

  console.log('6. Testing Guild Goods amount hover popover...');
  const ggPopoverCheck = await sendCdp(
    panel.webSocketDebuggerUrl,
    'Runtime.evaluate',
    {
      expression: `(async () => {
        ${hideAllPopoversExpr}

        const ggEl = document.getElementById('citystats-clan-goods');
        if (!ggEl) return { found: false };
        ggEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        return new Promise((resolve) => {
          setTimeout(() => {
            const popover = document.querySelector('.popover.show');
            resolve({
              found: true,
              shown: popover !== null,
              title: popover?.querySelector('.popover-header')?.textContent
            });
          }, 200);
        });
      })()`,
      awaitPromise: true,
      returnByValue: true,
    },
  );

  console.log('Guild Goods popover result:', ggPopoverCheck?.result?.value);
  if (!ggPopoverCheck?.result?.value?.shown) {
    console.error(
      '[test-panel-popovers] FAIL: Popover was not shown when hovering over Guild Goods amount!',
    );
    process.exit(1);
  }

  console.log(
    '7. Testing popover hover retention and scrollability/selection...',
  );
  const popoverRetentionCheck = await sendCdp(
    panel.webSocketDebuggerUrl,
    'Runtime.evaluate',
    {
      expression: `(async () => {
        ${hideAllPopoversExpr}

        const fpEl = document.getElementById('citystats-fp');
        if (!fpEl) return { error: 'no fpEl' };

        // 1. Hover on trigger
        fpEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 120));
        const popover = document.querySelector('.popover.show');
        if (!popover) return { error: 'popover not shown after trigger hover' };

        // 2. Transition mouse into popover
        fpEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, relatedTarget: popover }));
        popover.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, relatedTarget: fpEl }));

        // 3. Wait 400ms (longer than 350ms hideTimer)
        await new Promise((r) => setTimeout(r, 400));
        const stillShown = document.querySelector('.popover.show') !== null;

        // 4. Check CSS styling for scroll & text selection
        const popoverStyle = window.getComputedStyle(popover);
        const bodyStyle = window.getComputedStyle(popover.querySelector('.popover-body') || popover);

        // 5. Simulate mouse selection
        popover.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 400));
        const shownDuringSelection = document.querySelector('.popover.show') !== null;
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

        return {
          stillShown,
          overflowY: popoverStyle.overflowY,
          userSelect: popoverStyle.userSelect || bodyStyle.userSelect,
          shownDuringSelection
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    },
  );

  const retentionResult = popoverRetentionCheck?.result?.value;
  console.log('Popover retention result:', retentionResult);
  if (!retentionResult?.stillShown) {
    console.error(
      '[test-panel-popovers] FAIL: Popover closed while hovering over popover content!',
    );
    process.exit(1);
  }
  if (!retentionResult?.shownDuringSelection) {
    console.error(
      '[test-panel-popovers] FAIL: Popover closed during text selection!',
    );
    process.exit(1);
  }

  console.log(
    '[test-panel-popovers] SUCCESS: All popover interaction tests passed!',
  );
}

main().catch((err) => {
  console.error('[test-panel-popovers] Error:', err.message);
  process.exit(1);
});
