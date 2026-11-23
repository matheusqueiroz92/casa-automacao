import type { AuthRole } from '@casa/contracts/auth';
import { useCallback, useEffect, useState } from 'react';

export type ManagedUser = {
  createdAt: string;
  email: string;
  id: string;
  name: string;
  role: AuthRole;
};

export type CreateManagedUserInput = {
  email: string;
  name: string;
  password: string;
  role: AuthRole;
};

export type AdminUsersGateway = {
  createUser(input: CreateManagedUserInput): Promise<ManagedUser>;
  listUsers(): Promise<ManagedUser[]>;
  setRole(userId: string, role: AuthRole): Promise<ManagedUser>;
};

type LoadStatus = 'loading' | 'ready' | 'error';

export function useAdminUsers(gateway: AdminUsersGateway) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [mutationPending, setMutationPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const nextUsers = await gateway.listUsers();
      setUsers(nextUsers);
      setStatus('ready');
      setError(null);
    } catch {
      setStatus('error');
      setError('Não foi possível carregar os usuários.');
    }
  }, [gateway]);

  useEffect(() => {
    let active = true;

    gateway.listUsers().then(
      (nextUsers) => {
        if (!active) return;
        setUsers(nextUsers);
        setStatus('ready');
        setError(null);
      },
      () => {
        if (!active) return;
        setStatus('error');
        setError('Não foi possível carregar os usuários.');
      },
    );

    return () => {
      active = false;
    };
  }, [gateway]);

  const runMutation = useCallback(
    async (mutation: () => Promise<ManagedUser>): Promise<boolean> => {
      setMutationPending(true);
      setError(null);

      try {
        await mutation();
        await refresh();
        return true;
      } catch {
        setError('Não foi possível salvar a alteração. Verifique os dados e tente novamente.');
        return false;
      } finally {
        setMutationPending(false);
      }
    },
    [refresh],
  );

  const createUser = useCallback(
    (input: CreateManagedUserInput) => runMutation(() => gateway.createUser(input)),
    [gateway, runMutation],
  );

  const setRole = useCallback(
    (userId: string, role: AuthRole) => runMutation(() => gateway.setRole(userId, role)),
    [gateway, runMutation],
  );

  return {
    createUser,
    error,
    mutationPending,
    refresh,
    setRole,
    status,
    users,
  };
}
