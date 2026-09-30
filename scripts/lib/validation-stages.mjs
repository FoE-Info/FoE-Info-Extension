/** One ordered registry for local verification and captured CI runs. */
export const profiles = ['docs', 'static', 'full'];
const definitions = [
  ['version', 'repo', 'version:check', 'docs'],
  ['references', 'repo', 'audit:refs:published', 'docs'],
  ['format', 'repo', 'check', 'docs'],
  ['lint', 'static', 'lint', 'static'],
  ['types', 'static', 'typecheck', 'static'],
  ['architecture', 'contracts', 'contracts:audit', 'static'],
  ['rpc-contract', 'contracts', 'rpc:contract:check', 'static'],
  ['i18n', 'contracts', 'i18n:check', 'static'],
  ['tests', 'behavior', 'test', 'full'],
  ['coverage', 'quality', 'test:coverage', 'full'],
  ['build-dev', 'build', 'build:dev', 'full'],
  ['bundle-budget', 'quality', 'check:bundle-budget', 'full'],
];

export function validationStages(profile = 'full') {
  if (!profiles.includes(profile))
    throw new Error(`Unknown profile: ${profile}`);
  return [
    {
      id: 'readiness',
      layer: 'environment',
      command: ['node', 'scripts/doctor.mjs', '--profile', profile],
      selected: true,
    },
    ...definitions.map(([id, layer, script, minimum]) => ({
      id,
      layer,
      command: ['npm', 'run', script],
      selected: profiles.indexOf(minimum) <= profiles.indexOf(profile),
    })),
  ];
}
