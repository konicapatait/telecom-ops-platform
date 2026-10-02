// @file Native Federation config for mfe-partner-oversight: its name and exposed modules. Shared deps come only from libs/mf-manifest (ADR-0008).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');

// Shared deps come ONLY from libs/mf-manifest (ADR-0008).
module.exports = withPlatformFederation({
  name: 'mfe-partner-oversight',
  exposes: {
    './Routes': './apps/mfe-partner-oversight/src/app/partner-oversight.routes.ts',
    // Domain panel mounted as the "Overview" case tab (PARTNER_OVERSIGHT_DOMAIN_CONFIG).
    './PartnerOversightOverview':
      './apps/mfe-partner-oversight/src/app/overview/partner-oversight-overview.component.ts',
  },
});
