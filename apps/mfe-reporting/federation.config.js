// @file Native Federation config for mfe-reporting: name and exposed modules. Shared deps come only from libs/mf-manifest (ADR-0008).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');

// Shared deps come ONLY from libs/mf-manifest (ADR-0008). Expose exactly one entry: ./Routes.
module.exports = withPlatformFederation({
  name: 'mfe-reporting',
  exposes: {
    './Routes': './apps/mfe-reporting/src/app/reporting.routes.ts',
  },
});
