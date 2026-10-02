# ADR-0022: One "Case management" page: customer overview on top, each case-domain remote as a tab

- **Status:** Accepted
- **Date:** 2026-10-02
- **Supersedes:** the five separate case sections in the shell nav (ADR-0021 §5–6 routing details)

## Context
Agents asked for one Case management route instead of five sections (Fraud, Billing disputes, Service assurance, Number porting, Partner oversight). It should show basic details about the customer, with the domains as tabs underneath.

Choices made with the requester:

| Question | Answer |
| --- | --- |
| Overview of whom? | **The selected customer** (subscriber or partner); tabs show only that customer's cases |
| Where does a case open? | **Inside its tab**, below the overview and the domain tabs |
| Old section URLs? | **Replaced, and redirected** to the matching tab |
| Delivery | **Domains stay separate remotes**, loaded lazily per tab (independent deploys kept) |

## Decision
1. **New hub remote `mfe-case-management`** (tags `type:app family:case kind:hub`, generator `--kind=hub`). The shell has ONE nav entry for it (`opensCases: true`). It owns the page: overview + tab strip + outlet. The shell still owns only chrome (ADR-0002).
2. **Tabs are configuration**: `apps/mfe-case-management/src/app/case-management.tabs.ts` (`CASE_MANAGEMENT_TABS`): label, path, remote, the case domains each tab serves (and their sub-path, e.g. partner journeys), entitlement. `nx g … --kind=domain --family=case` now registers the new domain HERE instead of in the shell.
3. **URLs** (router-driven tabs: deep links, back button):
   - `/case-management/<tab>/…`: every case, unfiltered
   - `/case-management/customers/:customerId/<tab>/…`: focused on one customer
   - `/case-management/cases/:caseId`: looks up the case and redirects to its tab (target of `CaseEvent.OPEN_CASE`)
4. **Customer focus** is shared state: `CustomerContextStore` (contracts v1.2, additive; ONE writer: the hub). The shared `CaseQueueComponent` in every domain reads it and filters with `relevantSubjectIds(domain, customer)`. A subscriber's own cases go in subscriber domains, its linked dealers' cases in partner domains, and the reverse for partners. The same function computes the tab badges server-side (`/api/customers/:id`). Domain remotes needed **no change**.
5. **Overview without a chosen customer**: if a case is open, the overview shows that case's subject ("From the open case") with *Show all cases for …*. Otherwise it shows a customer search (`/api/customers?q=`).
6. **Each tab remembers its last URL** (e.g. an open case), so switching domains and back returns the agent where they were. Domain trees are recreated on switch; capability tabs inside a case remain keep-alive (ADR-0017).
7. **Per-tab isolation**: every tab is two routes: `{ canMatch: remoteAvailable(remote), loadChildren }`, then an in-tab "unavailable" fallback. `canMatch` caches nothing on failure, so **Retry** (same-URL navigation) or simply re-opening the tab recovers it without a reload.
8. **Legacy redirects**: `/fraud`, `/disputes`, `/assurance`, `/porting`, `/partners` → `/case-management/<same>`, **keeping the rest of the path and query** (a guard, because a prefix `redirectTo` drops them). Remove after one release.

## Consequences
- Entitlement `case-management:view` gates the page. Tabs and queues keep their own entitlements.
- `mfe-cap-account-view` is no longer shown on case screens (ADR-0023). The hub overview covers customer basics, and the capability is kept for Subscriber 360 (Phase 4).
- E2E: `apps/shell-e2e/src/case-management-hub.spec.ts` (6 tests).
