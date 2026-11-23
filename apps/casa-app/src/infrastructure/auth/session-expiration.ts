export function createSessionExpirationHandler(signOut: () => Promise<unknown>) {
  let pendingSignOut: Promise<void> | undefined;

  return async function expireSession(): Promise<void> {
    if (!pendingSignOut) {
      pendingSignOut = signOut()
        .then(() => undefined)
        .catch(() => undefined)
        .finally(() => {
          pendingSignOut = undefined;
        });
    }

    await pendingSignOut;
  };
}
