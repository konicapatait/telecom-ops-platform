// @file Native Federation config for mfe-number-porting: its name and exposed modules. Shared deps come only from libs/mf-manifest (ADR-0008).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');

// Shared deps come ONLY from libs/mf-manifest (ADR-0008).
module.exports = withPlatformFederation({
  name: 'mfe-number-porting',
  exposes: {
    './Routes': './apps/mfe-number-porting/src/app/number-porting.routes.ts',
    // Domain panel mounted as the "Overview" case tab (NUMBER_PORTING_DOMAIN_CONFIG).
    './NumberPortingOverview': './apps/mfe-number-porting/src/app/overview/number-porting-overview.component.ts',
  },
});
