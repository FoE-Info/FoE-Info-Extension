/**
 * StartupRenderOrchestrator.js
 *
 * Coordinates startup city stats rendering with missing metadata resolution.
 * Defers initial renderLiveCityStats if map contains unresolved building definitions,
 * Keeps every City Info render behind the same aggregate metadata completion barrier.
 * Dual CJS/ESM compatible.
 */

let activeRun = 0;
let renderPending = false;
let activeTimer;

function renderWhenStartupReady(render) {
  if (!renderPending) return render();
}

function detectMissingCityEntities(msg, getCityEntityDef) {
  if (
    !msg?.responseData?.city_map?.entities ||
    !Array.isArray(msg.responseData.city_map.entities) ||
    typeof getCityEntityDef !== 'function'
  ) {
    return [];
  }
  try {
    return msg.responseData.city_map.entities
      .map((e) => e && e.cityentity_id)
      .filter((cid) => cid && !getCityEntityDef(cid));
  } catch (err) {
    console.warn('Failed to detect missing city entities from map:', err);
    return [];
  }
}

function scheduleStartupRender({
  msg,
  timingRun,
  citystats,
  renderLiveCityStats,
  resolveMissingCityEntities,
  onResolved,
  getCityEntityDef,
  logger,
  loadingText = 'Loading metadata...',
  translateContainer,
  fallbackTimeoutMs = 3000,
}) {
  const run = ++activeRun;
  clearTimeout(activeTimer);
  renderPending = false;
  const gateStart = performance.now();
  const missing = detectMissingCityEntities(msg, getCityEntityDef);
  const traceGate = (phase, state) =>
    logger?.info?.(
      `[TIMING:${phase}] metadata gate ${state} | t = ${performance.now().toFixed(2)}ms | run = ${timingRun} | requestId = ${msg?.requestId} | missingInstances = ${missing.length} | uniqueIds = ${new Set(missing).size} | elapsedMs = ${(performance.now() - gateStart).toFixed(2)}`,
    );
  traceGate('P5g', 'scanned original startup city_map');

  if (missing.length > 0 && typeof resolveMissingCityEntities === 'function') {
    renderPending = true;
    if (citystats) {
      citystats.innerHTML = `<div class="card my-2 shadow-sm border-0"><div class="card-body py-2 px-3 text-muted d-flex align-items-center"><span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span><span data-i18n="loading-metadata">${loadingText}</span></div></div>`;
      if (typeof translateContainer === 'function') {
        translateContainer(citystats);
      }
    }
    traceGate('P5g', 'loading placeholder installed; starting resolver');

    let resolved = false;
    let fallbackRendered = false;
    const renderFallback = () => {
      if (fallbackRendered || run !== activeRun) return;
      fallbackRendered = true;
      renderPending = false;
      traceGate('P6g', 'fallback render');
      if (typeof renderLiveCityStats === 'function') renderLiveCityStats();
    };
    const fallbackTimer = (activeTimer = setTimeout(() => {
      if (resolved || run !== activeRun) return;
      logger?.warn('Metadata resolution timed out for entities:', missing);
      traceGate('P5g', 'resolver still pending; retaining loading placeholder');
    }, fallbackTimeoutMs));

    const handleFailure = (err) => {
      if (resolved || run !== activeRun) return;
      resolved = true;
      clearTimeout(fallbackTimer);
      traceGate('P6g', 'resolver failed');
      logger?.warn('Failed to resolve missing city entities from map:', err);
      renderFallback();
    };

    try {
      const pending = resolveMissingCityEntities(missing, () => {
        if (resolved || run !== activeRun) return;
        resolved = true;
        clearTimeout(fallbackTimer);
        renderPending = false;
        traceGate(
          'P6g',
          `resolver callback; fallbackRendered = ${fallbackRendered}`,
        );
        logger?.info(
          `[TIMING:P6] StartupRenderOrchestrator: metadata resolved/ready | t = ${performance.now().toFixed(2)}ms`,
        );
        if (typeof onResolved === 'function') {
          onResolved();
        } else if (typeof renderLiveCityStats === 'function') {
          renderLiveCityStats();
        }
      });
      if (pending && typeof pending.then === 'function') {
        Promise.resolve(pending).then(() => {
          // No successful downloads/no lookup URLs: resolver may settle without
          // invoking its update callback. Do not strand the loading indicator.
          if (resolved || run !== activeRun) return;
          resolved = true;
          clearTimeout(fallbackTimer);
          traceGate('P6g', 'resolver settled without metadata updates');
          renderFallback();
        }, handleFailure);
      }
    } catch (err) {
      handleFailure(err);
    }
  } else {
    traceGate('P6g', 'no missing entities; direct render');
    if (typeof renderLiveCityStats === 'function') {
      renderLiveCityStats();
    }
  }
}

module.exports = {
  detectMissingCityEntities,
  scheduleStartupRender,
  renderWhenStartupReady,
};
module.exports.default = module.exports;
