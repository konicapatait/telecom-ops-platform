// @file Native Federation config for shell: its name and exposed modules. Shared deps come only from libs/mf-manifest (ADR-0008).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');

// The host exposes nothing. Shared deps come ONLY from libs/mf-manifest (ADR-0008).
module.exports = withPlatformFederation({ name: 'shell' });
