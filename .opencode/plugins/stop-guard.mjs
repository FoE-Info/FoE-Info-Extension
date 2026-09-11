import { pendingSyncDetails } from './sync-state.mjs';

const busy = new Set();

export const StopGuard = async ({ client }) => {
  return {
    event: async ({ event }) => {
      if (event.type === 'session.status') {
        const { sessionID, status } = event.data;
        if (status.type === 'busy' || status.type === 'retry') {
          busy.add(sessionID);
        } else if (status.type === 'idle') {
          busy.delete(sessionID);
          const pending = pendingSyncDetails();
          if (pending.length) {
            const jobs = pending
              .map((j) => `${j.key} (${Math.round(j.elapsedMs / 1000)}s ago)`)
              .join(', ');
            await client.app.log({
              body: {
                service: 'stop-guard',
                level: 'warn',
                message: `Session idle while background graph syncs still running: ${jobs}. Wait for graphify AST rebuild before ending the session.`,
              },
            });
          }
        }
        return;
      }
      if (event.type === 'session.idle') {
        const pending = pendingSyncDetails();
        if (pending.length) {
          const jobs = pending
            .map((j) => `${j.key} (${Math.round(j.elapsedMs / 1000)}s ago)`)
            .join(', ');
          await client.app.log({
            body: {
              service: 'stop-guard',
              level: 'warn',
              message: `Session idle (legacy) while background graph syncs still running: ${jobs}.`,
            },
          });
        }
      }
    },
  };
};
