/**
 * @file Customer focus for Case management: CustomerSummary, CustomerContextStore and relevantSubjectIds (ADR-0022).
 */
import { Injectable, computed, signal } from '@angular/core';
import type { CaseDomain } from './case';

/** Case domains whose subject is a partner (dealer) rather than a subscriber. */
export const PARTNER_DOMAINS: readonly CaseDomain[] = ['PARTNER_ONBOARDING', 'PARTNER_ONGOING', 'PARTNER_FIELD_AUDIT'];

/**
 * The customer the Case management page is focused on (v1.2, additive). A customer is a subscriber
 * account or a partner (dealer). `relatedSubjectIds` links the two sides, e.g. the dealer that swapped
 * a subscriber's SIM, so the partner-oversight tab can show that dealer's cases for this subscriber.
 */
export interface CustomerSummary {
  customerId: string;
  kind: 'SUBSCRIBER' | 'PARTNER';
  displayName: string;
  status: string;
  /** Subscriber: CONSUMER | SMB | ENTERPRISE. Partner: tier. */
  segment?: string;
  /** ISO 8601 */
  since?: string;
  /** Subscriber: primary phone number. Partner: region. */
  contact?: string;
  plan?: string;
  lineCount?: number;
  balance?: number;
  currency?: string;
  relatedSubjectIds: string[];
  /** Open (not CLOSED) cases per domain, counted over relevantSubjectIds(domain, customer). */
  openCasesByDomain: Partial<Record<CaseDomain, number>>;
}

/**
 * Which case subjects a domain lists for a customer: the customer itself for its own side
 * (subscriber domains for a subscriber, partner domains for a partner), otherwise the related subjects.
 * Shared by the UI (queue filter, tab counts) and the backend/mocks so they always agree.
 */
export function relevantSubjectIds(domain: CaseDomain, customer: CustomerSummary): string[] {
  const partnerDomain = PARTNER_DOMAINS.includes(domain);
  return (customer.kind === 'PARTNER') === partnerDomain ? [customer.customerId] : customer.relatedSubjectIds;
}

/**
 * Ambient "which customer is the Case management page focused on". ONE writer: the case-management hub.
 * Readers (e.g. the case queue in every domain tab) filter by it. null = no customer selected (show all).
 */
@Injectable({ providedIn: 'root' })
export class CustomerContextStore {
  private readonly _customer = signal<CustomerSummary | null>(null);
  readonly customer = this._customer.asReadonly();
  readonly customerId = computed(() => this._customer()?.customerId ?? null);

  set(customer: CustomerSummary): void {
    this._customer.set(customer);
  }

  clear(): void {
    this._customer.set(null);
  }
}
