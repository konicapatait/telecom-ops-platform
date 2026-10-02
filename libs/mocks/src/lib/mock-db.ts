/**
 * @file Mutable in-memory "database" behind the mock handlers (cases, attachments, audit, decisions) for one page session.
 */
import type {
  Attachment,
  AuditAction,
  AuditCategory,
  AuditEvent,
  CaseResolution,
  CaseSummary,
} from '@platform/contracts';
import { ATTACHMENTS_BY_CASE } from '../fixtures/attachments';
import { AUDIT_BY_CASE, moved } from '../fixtures/audit';
import { CASES } from '../fixtures/cases';

/**
 * Mutable in-memory "database" behind the handlers. Writes in one tab (upload, decision) show up in another
 * (audit log), as they will with the real backend. Lives for the page session; `resetMockDb()` for tests.
 */
const clone = <T>(v: T): T => structuredClone(v);
let attachments: Record<string, Attachment[]> = clone(ATTACHMENTS_BY_CASE);
let audit: Record<string, AuditEvent[]> = clone(AUDIT_BY_CASE);
let cases: CaseSummary[] = clone(CASES);
let resolutions: Record<string, CaseResolution> = {};
const accessed = new Set<string>();
let seq = 100;

export function resetMockDb(): void {
  attachments = clone(ATTACHMENTS_BY_CASE);
  audit = clone(AUDIT_BY_CASE);
  cases = clone(CASES);
  resolutions = {};
  accessed.clear();
  seq = 100;
}

/** Live case rows (status changes when a case is resolved). */
export function allCases(): CaseSummary[] {
  return cases;
}

export function findCase(caseId: string): CaseSummary | undefined {
  return cases.find((c) => c.caseId === caseId);
}

export function resolutionFor(caseId: string): CaseResolution | undefined {
  return resolutions[caseId];
}

export function resolveCase(resolution: CaseResolution): void {
  resolutions[resolution.caseId] = resolution;
  const c = findCase(resolution.caseId);
  if (c) c.status = 'CLOSED';
}

export function attachmentsFor(caseId: string): Attachment[] {
  return (attachments[caseId] ??= []);
}

/** Newest first. Non-hero cases get a generated workflow trail (created → New → Readiness Check). */
export function auditFor(caseId: string): AuditEvent[] {
  if (!audit[caseId]) {
    const c = findCase(caseId);
    audit[caseId] = c
      ? [
          moved(`AUD-${caseId}-3`, c.openedAt, 'TIER', 'Readiness Check'),
          moved(`AUD-${caseId}-2`, c.openedAt, 'STAGE', 'New'),
          {
            eventId: `AUD-${caseId}-1`,
            at: c.openedAt,
            actor: 'System',
            action: 'CASE_CREATED',
            category: 'ACTIVITY',
            component: 'Case intake',
            detail: `${c.caseType} alert raised`,
          },
        ]
      : [];
  }
  return audit[caseId];
}

/** Backend-side audit write (the UI never writes audit events; ADR-0017). */
export function appendAudit(
  caseId: string,
  action: AuditAction,
  detail: string,
  actor: string,
  extra: { category?: AuditCategory; component?: string; to?: string } = {},
): AuditEvent {
  const event: AuditEvent = {
    eventId: `AUD-${++seq}`,
    at: new Date().toISOString(),
    actor,
    action,
    detail,
    category: 'ACTIVITY',
    ...extra,
  };
  auditFor(caseId).unshift(event);
  return event;
}

/** "Case accessed in view mode": logged once per user per case per session (like the real backend's access log). */
export function logAccess(caseId: string, actor: string): void {
  const key = `${caseId}|${actor}`;
  if (accessed.has(key) || !findCase(caseId)) return;
  accessed.add(key);
  appendAudit(caseId, 'CASE_ACCESSED', 'Case accessed in view mode', actor, {
    category: 'SUBPROCESS',
    component: 'Case screen',
  });
}

export function nextId(prefix: string): string {
  return `${prefix}-${++seq}`;
}
