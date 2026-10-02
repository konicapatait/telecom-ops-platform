/**
 * @file Mock API: GET /api/me/entitlements for the persona in the bearer token.
 */
import { http, HttpResponse } from 'msw';
import type { EntitlementsResponse } from '@platform/contracts';
import { DEFAULT_FEATURE_FLAGS, personaFromRequest } from '../personas';
import { mockDelay } from '../lib/mock-flags';
import { api } from '../lib/api-path';

export const identityHandlers = [
  http.get(api('/me/entitlements'), async ({ request }) => {
    await mockDelay();
    const persona = personaFromRequest(request);
    return HttpResponse.json<EntitlementsResponse>({
      entitlements: persona.entitlements,
      featureFlags: DEFAULT_FEATURE_FLAGS,
    });
  }),
];
