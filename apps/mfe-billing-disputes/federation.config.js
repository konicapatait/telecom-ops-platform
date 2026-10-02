// @file Native Federation config for mfe-billing-disputes: its name and exposed modules. Shared deps come only from libs/mf-manifest (ADR-0008).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');

// Shared deps come ONLY from libs/mf-manifest (ADR-0008).
module.exports = withPlatformFederation({
  name: 'mfe-billing-disputes',
  exposes: {
    './Routes': './apps/mfe-billing-disputes/src/app/billing-disputes.routes.ts',
    // Domain panel mounted as the "Overview" case tab (BILLING_DISPUTES_DOMAIN_CONFIG).
    './BillingDisputesOverview': './apps/mfe-billing-disputes/src/app/overview/billing-disputes-overview.component.ts',
  },
});
