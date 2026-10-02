/** Origin-agnostic MSW path: matches `/api/x` on the shell origin, a remote's dev origin, and in Node tests. */
export const api = (path: `/${string}`): string => `*/api${path}`;
