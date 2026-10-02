/**
 * @file Small HTTP response helpers for mock handlers (403/404/500) and the persona entitlement check.
 */
import { HttpResponse } from 'msw';
import type { Persona } from '@platform/contracts';

export const forbidden = (entitlement: string) =>
  HttpResponse.json({ message: `Missing entitlement ${entitlement}` }, { status: 403 });

export const notFound = (what: string) => HttpResponse.json({ message: `${what} not found` }, { status: 404 });

export const simulatedFailure = () => HttpResponse.json({ message: 'Simulated failure (?mockFail)' }, { status: 500 });

export const has = (persona: Persona, entitlement: string) => persona.entitlements.includes(entitlement);
