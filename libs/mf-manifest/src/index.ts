/**
 * @file Public API of @platform/mf-manifest: the runtime manifest, the ONLY remote loaders, and federation
 * diagnostics (ADR-0007, ADR-0008, ADR-0025). The shared federation config lives next to it in shared.config.js.
 */
export * from './lib/manifest';
export * from './lib/load-remote';
export * from './lib/diagnostics';
export * from './lib/platform-diagnostics';
