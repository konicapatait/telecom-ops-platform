/**
 * @file Audit-log fixtures: the hero fraud case's workflow trail (tier/stage/subprocess) and activities (ADR-0023).
 */
import type { AuditEvent } from '@platform/contracts';

/** Workflow transition event ("Case moved to X"). */
export function moved(eventId: string, at: string, category: 'TIER' | 'STAGE' | 'SUBPROCESS', to: string): AuditEvent {
  return {
    eventId,
    at,
    actor: 'System',
    action: 'WORKFLOW_MOVED',
    category,
    to,
    component: 'Workflow',
    detail: `Case moved to ${to}`,
  };
}

/** Newest first, append-only (the API order). The audit log UI shows them oldest first. */
export const AUDIT_BY_CASE: Record<string, AuditEvent[]> = {
  'FRD-2026-000142': [
    {
      eventId: 'AUD-9',
      at: '2026-09-21T15:30:00Z',
      actor: 'Priya Natarajan',
      action: 'TAB_VIEWED',
      category: 'ACTIVITY',
      component: 'Case screen',
      detail: 'Triggering info viewed',
    },
    {
      eventId: 'AUD-8',
      at: '2026-09-21T15:03:00Z',
      actor: 'Priya Natarajan',
      action: 'ATTACHMENT_ADDED',
      category: 'ACTIVITY',
      component: 'Attachments',
      detail: 'store-cctv-request.docx',
    },
    {
      eventId: 'AUD-7',
      at: '2026-09-21T15:00:00Z',
      actor: 'Priya Natarajan',
      action: 'ATTACHMENT_ADDED',
      category: 'ACTIVITY',
      component: 'Attachments',
      detail: 'id-scan-at-store.pdf',
    },
    {
      eventId: 'AUD-6',
      at: '2026-09-21T14:20:00Z',
      actor: 'System',
      action: 'CASE_ASSIGNED',
      category: 'ACTIVITY',
      component: 'Assignment',
      detail: 'Assigned to Priya Natarajan',
    },
    moved('AUD-5', '2026-09-21T14:12:00Z', 'SUBPROCESS', 'Available to Pull'),
    moved('AUD-4', '2026-09-21T14:11:00Z', 'STAGE', 'Ready For Work'),
    moved('AUD-3', '2026-09-21T14:10:00Z', 'TIER', 'Standard Investigation'),
    moved('AUD-2', '2026-09-21T14:06:00Z', 'STAGE', 'New'),
    moved('AUD-1b', '2026-09-21T14:05:30Z', 'TIER', 'Readiness Check'),
    {
      eventId: 'AUD-1',
      at: '2026-09-21T14:05:00Z',
      actor: 'System',
      action: 'CASE_CREATED',
      category: 'ACTIVITY',
      component: 'Fraud rules engine',
      detail: 'SIM-swap fraud rule triggered',
    },
  ],
};
