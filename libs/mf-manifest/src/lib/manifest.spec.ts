import { getRemoteManifest, isRemoteDeployed, setRemoteManifest } from './manifest';
import { REMOTE_NAMES } from '@platform/contracts';

describe('remote manifest', () => {
  it('drops entries that are not known remotes or have no URL', () => {
    const known = REMOTE_NAMES[0];
    setRemoteManifest({
      ...(known ? { [known]: 'http://localhost:4201/remoteEntry.json' } : {}),
      'not-a-remote': 'x',
      ...(known ? {} : {}),
    });
    expect(Object.keys(getRemoteManifest())).toEqual(known ? [known] : []);
    if (known) expect(isRemoteDeployed(known)).toBe(true);
  });

  it('treats an empty manifest as no remotes', () => {
    setRemoteManifest({});
    expect(getRemoteManifest()).toEqual({});
  });
});
