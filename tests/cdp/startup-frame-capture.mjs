import { mkdir, writeFile } from 'node:fs/promises';

// Numeric values only: no player names, request payloads, or authentication data.
export function renderObserverExpression(framesMode) {
  return `(() => {
    let previousRoot = document.getElementById('citystats');
    let previousNumbers;
    const snapshot = (kind) => {
      const root = document.getElementById('citystats');
      const numbers = ${framesMode} ? [...(root?.innerText.match(/[0-9]+(?:[.,][0-9]+)*(?:[KMB%])?/g) ?? [])] : undefined;
      const value = {time: performance.timeOrigin + performance.now(), kind, fullCard: !!root?.querySelector('#citystats-copy-btn'), spinner: !!root?.querySelector('.spinner-border'), numbers};
      if (kind !== 'raf' || JSON.stringify(value.numbers) + value.spinner !== previousNumbers) window.__foeTimingRender(JSON.stringify(value));
      if (kind === 'raf') previousNumbers = JSON.stringify(value.numbers) + value.spinner;
    };
    window.__foeTimingObserver = new MutationObserver((mutations) => {
      const root = document.getElementById('citystats');
      const changed = root !== previousRoot || mutations.some((m) => root?.contains(m.target));
      previousRoot = root;
      if (changed) snapshot('mutation');
    });
    window.__foeTimingObserver.observe(document.body, {childList: true, subtree: true});
    if (${framesMode}) {
      const tick = () => { snapshot('raf'); window.__foeTimingRAF = requestAnimationFrame(tick); };
      window.__foeTimingRAF = requestAnimationFrame(tick);
    }
    return true;
  })()`;
}

export async function startFrameCapture(session) {
  try {
    await session.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 85,
      maxWidth: 1800,
      maxHeight: 1400,
      everyNthFrame: 1,
    });
    return true;
  } catch (error) {
    console.log(
      '[CDP Verify] Screencast unavailable; DOM/rAF evidence only:',
      error.message,
    );
    return false;
  }
}

export async function saveFrames(frames, navStart, details) {
  const directory = `/tmp/foe-timing-frames-${navStart}`;
  await mkdir(directory, { recursive: true });
  await Promise.all(
    frames.map((frame, index) =>
      writeFile(
        `${directory}/${index}-${Math.round(frame.time - navStart)}ms.jpg`,
        Buffer.from(frame.data, 'base64'),
      ),
    ),
  );
  await writeFile(
    `${directory}/timeline.json`,
    JSON.stringify(
      {
        navStart,
        ...details,
        frames: frames.map(({ time }, index) => ({
          index,
          ms: time - navStart,
        })),
      },
      null,
      2,
    ),
  );
  console.log(
    `[CDP Verify] ${frames.length} painted DevTools screencast frames saved to ${directory}`,
  );
}
