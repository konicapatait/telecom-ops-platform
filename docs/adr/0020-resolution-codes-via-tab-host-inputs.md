# ADR-0020: The resolution capability receives its domain's codes as an explicit, typed input

- **Status:** Accepted (amended by [ADR-0023](0023-four-tab-case-screen.md): the decision is now the first case tab, not the action rail)
- **Date:** 2026-10-02
- **Amends:** ADR-0004 (capabilities receive only `caseId` + `caseType`)

## Context
One `mfe-cap-case-resolution` serves every case domain, but the codes differ per domain (Fraud: confirmed, false positive, refer to law enforcement; Disputes: upheld, partial, rejected …). The plan puts the codes in each domain's `CaseDomainConfig.resolutionCodes`. ADR-0004 only allows `caseId` and `caseType` as inputs, so the capability had no clean way to see them.

## Options
| Option | Verdict |
| --- | --- |
| A. Capability injects the domain config through DI (move the token to contracts) | Rejected: an implicit dependency on the host's injector, which the plan's rule "never reads another MFE's state" forbids |
| B. Backend endpoint `GET /cases/:id/resolution-options` | Viable later, but contradicts the plan's "codes from domain config" and makes the UI wait for a backend |
| **C. Tab host passes extra, typed inputs** | **Chosen** |

## Decision
- Contracts v1.1 (additive): `CaseResolutionInputs extends CaseCapabilityInputs { resolutionCodes }`.
- `CapabilityTabHostComponent` gets an optional `inputs: Record<string, unknown>` and sets each one with `setInput`, initially and whenever it changes.
- `CaseViewComponent` passes `{ resolutionCodes: config.resolutionCodes }` **only** to the action-rail host. Ordinary tabs still receive only `caseId` + `caseType`.
- The **backend validates** the code anyway (the mock answers 422 for another domain's code). The UI list is a convenience, not the authority.
- The form is a typed reactive form. A group validator makes `note` required when the chosen code says `requiresNote`. On success the capability emits `CaseEvent.CASE_RESOLVED`. The case view marks its case `CLOSED` locally and the audit tab reloads, with no extra fetch.

## Consequences
- Any future capability needing more than `caseId`/`caseType` must get a named `…Inputs` contract, never an untyped bag.
