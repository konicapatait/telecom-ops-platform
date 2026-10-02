// @file Native Federation config for mfe-case-management: its name and exposed modules. Shared deps come only from libs/mf-manifest (ADR-0008).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');

// Shared deps come ONLY from libs/mf-manifest (ADR-0008). Expose exactly one entry: ./Routes.
module.exports = withPlatformFederation({
  name: 'mfe-case-management',
  exposes: {
    './Routes': './apps/mfe-case-management/src/app/case-management.routes.ts',
  },
});
