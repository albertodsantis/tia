import { PostHog } from 'posthog-node';

const apiKey = process.env.POSTHOG_API_KEY ?? '';
const host = process.env.POSTHOG_HOST;
const enabled = apiKey.length > 0;

const client = enabled
  ? new PostHog(apiKey, { ...(host ? { host } : {}) })
  : null;

type CaptureArgs = Parameters<PostHog['capture']>[0];
type IdentifyArgs = Parameters<PostHog['identify']>[0];

export const posthog = {
  capture(args: CaptureArgs) {
    client?.capture(args);
  },
  identify(args: IdentifyArgs) {
    client?.identify(args);
  },
  captureException(error: unknown, distinctId?: string) {
    client?.captureException(error, distinctId);
  },
  async shutdown() {
    await client?.shutdown();
  },
};

if (enabled) {
  process.on('SIGINT', async () => {
    await client!.shutdown();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await client!.shutdown();
    process.exit(0);
  });
}
