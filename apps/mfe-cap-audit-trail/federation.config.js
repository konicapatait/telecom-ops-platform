// @file Native Federation config for mfe-cap-audit-trail: its name and exposed modules. Shared deps come only from libs/mf-manifest (ADR-0008).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');

// Shared deps come ONLY from libs/mf-manifest (ADR-0008). A capability exposes exactly ONE component.
module.exports = withPlatformFederation({
  name: 'mfe-cap-audit-trail',
  exposes: {
    './AuditTrail': './apps/mfe-cap-audit-trail/src/app/audit-trail.component.ts',
  },
});
