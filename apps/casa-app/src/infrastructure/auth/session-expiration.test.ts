import { createSessionExpirationHandler } from './session-expiration';

describe('createSessionExpirationHandler', () => {
  it('coalesces simultaneous expiration notifications into one sign-out', async () => {
    let finishSignOut: (() => void) | undefined;
    const signOut = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSignOut = resolve;
        }),
    );
    const expireSession = createSessionExpirationHandler(signOut);

    const first = expireSession();
    const second = expireSession();

    expect(signOut).toHaveBeenCalledTimes(1);
    finishSignOut?.();
    await Promise.all([first, second]);
  });

  it('does not propagate a sign-out transport failure to the API request', async () => {
    const expireSession = createSessionExpirationHandler(async () => {
      throw new Error('network unavailable');
    });

    await expect(expireSession()).resolves.toBeUndefined();
  });
});
