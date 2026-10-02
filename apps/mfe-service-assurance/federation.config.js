// @file Native Federation config for mfe-service-assurance: its name and exposed modules. Shared deps come only from libs/mf-manifest (ADR-0008).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');

// Shared deps come ONLY from libs/mf-manifest (ADR-0008).
module.exports = withPlatformFederation({
  name: 'mfe-service-assurance',
  exposes: {
    './Routes': './apps/mfe-service-assurance/src/app/service-assurance.routes.ts',
    // Domain panel mounted as the "Overview" case tab (SERVICE_ASSURANCE_DOMAIN_CONFIG).
    './ServiceAssuranceOverview':
      './apps/mfe-service-assurance/src/app/overview/service-assurance-overview.component.ts',
  },
});
