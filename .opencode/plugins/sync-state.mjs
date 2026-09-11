const running = new Map();

export function trackSync(key, handle = null) {
  running.set(key, { key, startedAt: Date.now(), handle });
}

export function untrackSync(key) {
  running.delete(key);
}

export function pendingSyncs() {
  return [...running.keys()];
}

export function pendingSyncDetails() {
  return [...running.values()].map(({ key, startedAt }) => ({
    key,
    elapsedMs: Date.now() - startedAt,
  }));
}

export async function awaitPendingSyncs({
  timeoutMs = 60_000,
  pollMs = 200,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  while (running.size > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  return pendingSyncDetails();
}
