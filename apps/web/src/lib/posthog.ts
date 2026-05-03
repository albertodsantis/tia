import posthog from 'posthog-js';

const apiKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';

let initialized = false;

export function initPostHog() {
  if (initialized || !apiKey || import.meta.env.DEV) return;
  posthog.init(apiKey, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: true,
    persistence: 'localStorage+cookie',
  });
  initialized = true;
}

export function identifyUser(user: { id: string; email?: string; name?: string; provider?: string; plan?: string }) {
  if (!initialized) return;
  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
    provider: user.provider,
    plan: user.plan,
  });
}

export function resetPostHog() {
  if (!initialized) return;
  posthog.reset();
}

export function captureEvent(name: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(name, props);
}

export { posthog };
