// @file Native Federation config for mfe-partner-view: its name and exposed modules. Shared deps come only from libs/mf-manifest (ADR-0008).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');

// Shared deps come ONLY from libs/mf-manifest (ADR-0008). Expose exactly one entry: ./Routes.
module.exports = withPlatformFederation({
  name: 'mfe-partner-view',
  exposes: {
    './Routes': './apps/mfe-partner-view/src/app/partner-view.routes.ts',
  },
});
