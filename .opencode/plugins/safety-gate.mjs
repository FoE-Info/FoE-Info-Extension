import { isDangerousCommand } from '../../.agents/scripts/safety-gate.mjs';

export const SafetyGate = async ({ project }) => {
  return {
    'tool.execute.before': async (input, output) => {
      if (input.tool !== 'bash') return;
      const command = output.args?.command ?? '';
      if (isDangerousCommand(command)) {
        throw new Error(
          `Workspace safety-gate: destructive command blocked (non-overridable): "${command}". ` +
            'This is a safety backstop for commands the user config cannot override. ' +
            'Commands not matching an allow rule already prompt the user interactively.',
        );
      }
    },
  };
};
