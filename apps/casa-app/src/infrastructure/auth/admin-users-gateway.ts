import { AUTH_ROLES, hasAdminRole, type AuthRole } from '@casa/contracts/auth';

import {
  type AdminUsersGateway,
  type CreateManagedUserInput,
  type ManagedUser,
} from '@/features/users/use-admin-users';
import { authClient } from '@/infrastructure/auth/auth-client';

type BetterAuthUser = {
  createdAt: Date | string;
  email: string;
  id: string;
  name: string;
  role?: string | null | undefined;
};

function toManagedUser(user: BetterAuthUser): ManagedUser {
  const createdAt = user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt;

  return {
    createdAt,
    email: user.email,
    id: user.id,
    name: user.name,
    role: hasAdminRole(user.role) ? AUTH_ROLES.admin : AUTH_ROLES.user,
  };
}

function requireData<T>(data: T | null, message: string): T {
  if (!data) throw new Error(message);
  return data;
}

class BetterAuthAdminUsersGateway implements AdminUsersGateway {
  async listUsers(): Promise<ManagedUser[]> {
    const result = await authClient.admin.listUsers({
      query: { limit: 100, sortBy: 'createdAt', sortDirection: 'desc' },
    });
    const data = requireData(result.data, result.error?.message ?? 'Falha ao listar usuários');
    return data.users.map(toManagedUser);
  }

  async createUser(input: CreateManagedUserInput): Promise<ManagedUser> {
    const result = await authClient.admin.createUser(input);
    const data = requireData(result.data, result.error?.message ?? 'Falha ao criar usuário');
    return toManagedUser(data.user);
  }

  async setRole(userId: string, role: AuthRole): Promise<ManagedUser> {
    const result = await authClient.admin.setRole({ role, userId });
    const data = requireData(result.data, result.error?.message ?? 'Falha ao alterar permissão');
    return toManagedUser(data.user);
  }
}

export const adminUsersGateway = new BetterAuthAdminUsersGateway();
