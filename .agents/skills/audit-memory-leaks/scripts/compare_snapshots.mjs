import * as fs from 'node:fs';

/**
 * Compare two V8 .heapsnapshot JSON files to isolate growing objects and memory leaks.
 */
function parseSnapshot(filePath) {
  console.log(`Loading ${filePath}...`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const strings = data.strings;
  const nodes = data.nodes;
  const nodeFields = data.snapshot.meta.node_fields;
  const nodeFieldCount = nodeFields.length;

  const typeOffset = nodeFields.indexOf('type');
  const nameOffset = nodeFields.indexOf('name');
  const sizeOffset = nodeFields.indexOf('self_size');

  const nodeTypes = data.snapshot.meta.node_types[typeOffset];

  const counts = {};
  const sizes = {};

  for (let i = 0; i < nodes.length; i += nodeFieldCount) {
    const typeIdx = nodes[i + typeOffset];
    const typeName = nodeTypes[typeIdx];
    const nameIdx = nodes[i + nameOffset];
    const name = typeof nameIdx === 'number' ? strings[nameIdx] : nameIdx;
    const size = nodes[i + sizeOffset];

    // Ignore native primitives/arrays that clutter the output
    if (
      typeName === 'string' ||
      typeName === 'number' ||
      typeName === 'array'
    ) {
      continue;
    }

    const key = `${typeName}::${name}`;
    counts[key] = (counts[key] || 0) + 1;
    sizes[key] = (sizes[key] || 0) + size;
  }
  return { counts, sizes };
}

function displayDiff(snapA, snapB, label) {
  const diffs = [];
  for (const key in snapB.counts) {
    const countA = snapA.counts[key] || 0;
    const countB = snapB.counts[key];
    const sizeA = snapA.sizes[key] || 0;
    const sizeB = snapB.sizes[key];

    if (countB > countA) {
      diffs.push({
        key,
        countDiff: countB - countA,
        sizeDiff: sizeB - sizeA,
      });
    }
  }

  diffs.sort((a, b) => b.sizeDiff - a.sizeDiff);

  console.log(`\n=== ${label} ===`);
  console.log('--- Top 10 growing objects by size ---');
  diffs.slice(0, 10).forEach((d) => {
    console.log(`${d.key}: +${d.countDiff} objects, +${d.sizeDiff} bytes`);
  });

  // Look for common leak indicators (detached DOM, closures, listeners)
  const commonLeaks = diffs.filter(
    (d) =>
      d.key.toLowerCase().includes('detached') ||
      d.key.toLowerCase().includes('html') ||
      d.key.toLowerCase().includes('eventlistener') ||
      d.key.toLowerCase().includes('context') ||
      d.key.toLowerCase().includes('closure')
  );

  commonLeaks.sort((a, b) => b.countDiff - a.countDiff);

  console.log('\n--- Top 3 most common types of memory leaks found ---');
  if (commonLeaks.length === 0) {
    console.log('No common DOM or Closure leaks detected.');
  } else {
    commonLeaks.slice(0, 3).forEach((d) => {
      console.log(`${d.key}: +${d.countDiff} objects, +${d.sizeDiff} bytes`);
    });
  }
}

const [, , file1, file2, file3] = process.argv;
if (!file1 || !file2) {
  console.error(
    'Usage: node compare_snapshots.mjs <baseline.heapsnapshot> <target.heapsnapshot> [final.heapsnapshot]'
  );
  process.exit(1);
}

try {
  const snap1 = parseSnapshot(file1);
  const snap2 = parseSnapshot(file2);

  if (file3) {
    const snap3 = parseSnapshot(file3);
    displayDiff(snap1, snap2, 'Active Allocation: Baseline -> Target (Peak Load)');
    displayDiff(snap1, snap3, 'Persistent Leaks: Baseline -> Final (Post-Revert / GC)');
  } else {
    displayDiff(snap1, snap2, 'Snapshot Comparison: Baseline -> Target');
  }
} catch (error) {
  console.error(
    'Error parsing snapshots. They might be too large for JSON.parse or invalid.'
  );
  console.error(error.message);
}
