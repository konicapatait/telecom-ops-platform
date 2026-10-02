// @file Native Federation config for mfe-fraud: its name and exposed modules. Shared deps come only from libs/mf-manifest (ADR-0008).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');

// Shared deps come ONLY from libs/mf-manifest (ADR-0008).
module.exports = withPlatformFederation({
  name: 'mfe-fraud',
  exposes: {
    './Routes': './apps/mfe-fraud/src/app/fraud.routes.ts',
    // Domain panel mounted as the "Overview" case tab (FRAUD_DOMAIN_CONFIG).
    './FraudOverview': './apps/mfe-fraud/src/app/overview/fraud-overview.component.ts',
  },
});
