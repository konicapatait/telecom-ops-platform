/**
 * @file Cross-MFE events (versioned names) and their payload types.
 */
import type { CaseDomain } from './case';

/** Cross-MFE events. Names are versioned; never change a payload, add a new `.v2` event instead. */
export enum CaseEvent {
  ATTACHMENT_ADDED = 'case.attachment.added.v1',
  CASE_RESOLVED = 'case.resolved.v1',
  OPEN_SUBSCRIBER_360 = 'nav.subscriber360.open.v1',
  /** Ask the shell to open a case in its domain's section (case search). v1.1, additive. */
  OPEN_CASE = 'nav.case.open.v1',
  /** Ask the shell to open a partner's 360 view. v1.3, additive. */
  OPEN_PARTNER_360 = 'nav.partner360.open.v1',
}

export interface CaseEventPayloads {
  [CaseEvent.ATTACHMENT_ADDED]: { caseId: string; attachmentId: string };
  [CaseEvent.CASE_RESOLVED]: { caseId: string; code: string; at: string };
  [CaseEvent.OPEN_SUBSCRIBER_360]: { accountId: string };
  [CaseEvent.OPEN_CASE]: { caseId: string; domain: CaseDomain };
  [CaseEvent.OPEN_PARTNER_360]: { partnerId: string };
}

export interface CaseEventMessage<E extends CaseEvent = CaseEvent> {
  type: E;
  payload: CaseEventPayloads[E];
}
