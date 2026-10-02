# ADR-0026: Rename the 360 views to "Customer full profile" and "Agent full profile" (labels and URLs)

- **Status:** Accepted
- **Date:** 2026-10-02
- **Amends:** ADR-0024 (names and URLs only)

## Decision
Requested by the product owner. The mapping and depth were confirmed:

| Before | After (user-facing) | URL before → after |
| --- | --- | --- |
| Subscriber 360 | **Customer full profile** | `/subscribers/:id` → `/customer-full-profile/:id` |
| Partner 360 (the dealer/agent view) | **Agent full profile** | `/partner-360/:id` → `/agent-full-profile/:id` |
| Nav group "Customer & partner 360" | **Full profiles** | – |

- **Changed:** nav labels and group, page titles, buttons ("Customer full profile" / "Agent full profile" in the Case management overview), cross-links, banner badges ("Customer", "Agent"), section titles ("Linked agents", "Linked customers"), the shell's 'not available' toast, and the generator's nav group for `--family=360`.
- **Unchanged on purpose** (depth "labels and URLs"): app and lib names (`mfe-subscriber-view`, `mfe-partner-view`, `layout-360`), contract names (`OPEN_SUBSCRIBER_360`, `OPEN_PARTNER_360`, `SubscriberCapabilityInputs`), entitlements (`subscribers:view`, `partner360:view`) and the backend APIs. Renaming those would be a breaking contract change for no user benefit.
- **Old URLs redirect**, keeping the id and query (`LEGACY_REDIRECTS` guard): `/subscribers/…` and `/partner-360/…`.
- "Partner" stays the term on case screens (the *Partner oversight* case domain). "Agent" is used on the full-profile views only.

## Consequences
- Internal names and user-facing names now differ. The architecture map lists both.
- E2E `phase-4-360.spec.ts` covers the new URLs, labels and redirects.
