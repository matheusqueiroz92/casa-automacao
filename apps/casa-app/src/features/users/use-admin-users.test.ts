import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  type AdminUsersGateway,
  type ManagedUser,
  useAdminUsers,
} from './use-admin-users';

const admin: ManagedUser = {
  createdAt: '2026-11-23T10:00:00.000Z',
  email: 'admin@example.com',
  id: 'admin-1',
  name: 'Administrador',
  role: 'admin',
};

function createGateway(overrides: Partial<AdminUsersGateway> = {}): AdminUsersGateway {
  return {
    createUser: jest.fn().mockResolvedValue(admin),
    listUsers: jest.fn().mockResolvedValue([admin]),
    setRole: jest.fn().mockResolvedValue(admin),
    ...overrides,
  };
}

describe('useAdminUsers', () => {
  it('loads the managed users', async () => {
    const gateway = createGateway();
    const { result } = await renderHook(() => useAdminUsers(gateway));

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.users).toEqual([admin]);
  });

  it('creates a resident and refreshes the list', async () => {
    const gateway = createGateway();
    const { result } = await renderHook(() => useAdminUsers(gateway));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.createUser({
        email: 'morador@example.com',
        name: 'Morador',
        password: 'uma-senha-segura',
        role: 'user',
      });
    });

    expect(gateway.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'morador@example.com', role: 'user' }),
    );
    expect(gateway.listUsers).toHaveBeenCalledTimes(2);
  });

  it('changes a user role and refreshes the list', async () => {
    const gateway = createGateway();
    const { result } = await renderHook(() => useAdminUsers(gateway));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.setRole('admin-1', 'user');
    });

    expect(gateway.setRole).toHaveBeenCalledWith('admin-1', 'user');
    expect(gateway.listUsers).toHaveBeenCalledTimes(2);
  });
});
