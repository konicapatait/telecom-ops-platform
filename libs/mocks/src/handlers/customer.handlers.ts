/**
 * @file Mock API: customer search and customer summary for the Case management overview (ADR-0022).
 */
import { http, HttpResponse } from 'msw';
import type { CustomerSummary } from '@platform/contracts';
import { customerSummary, searchCustomers } from '../fixtures/customers';
import { api } from '../lib/api-path';
import { notFound } from '../lib/http-errors';
import { allCases } from '../lib/mock-db';
import { mockDelay } from '../lib/mock-flags';

export const customerHandlers = [
  /** GET /api/customers?q=delgado : subscribers and partners by id, name or phone number. */
  http.get(api('/customers'), async ({ request }) => {
    await mockDelay();
    return HttpResponse.json<CustomerSummary[]>(
      searchCustomers(new URL(request.url).searchParams.get('q') ?? '', allCases()),
    );
  }),
  /** GET /api/customers/:customerId : overview + open-case counts per domain. */
  http.get(api('/customers/:customerId'), async ({ params }) => {
    await mockDelay();
    const summary = customerSummary(params['customerId'] as string, allCases());
    return summary ? HttpResponse.json<CustomerSummary>(summary) : notFound('Customer');
  }),
];
