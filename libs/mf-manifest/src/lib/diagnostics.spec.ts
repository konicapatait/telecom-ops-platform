import { classifyRemoteError } from './diagnostics';

describe('classifyRemoteError', () => {
  it.each([
    [new Error('"mfe-x" is not in this environment\'s manifest'), 'NOT_IN_MANIFEST'],
    [new TypeError('Failed to fetch'), 'REMOTE_ENTRY_UNREACHABLE'],
    [
      new Error('Error loading remote entry for mfe-x from file http://localhost:4201/remoteEntry.json'),
      'REMOTE_ENTRY_UNREACHABLE',
    ],
    [new Error('Unknown exposed module ./Nope in remote mfe-x'), 'EXPOSED_MODULE_MISSING'],
    [new Error("Unable to resolve specifier '@platform/auth/mock'"), 'MODULE_IMPORT_FAILED'],
    [new Error('No component export'), 'NO_EXPORT'],
    [new Error('Simulated failure (?mockFail)'), 'SIMULATED'],
    ['something odd', 'UNKNOWN'],
  ])('%s → %s', (reason, code) => {
    expect(classifyRemoteError(reason)).toBe(code);
  });
});
