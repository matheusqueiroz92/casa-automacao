import { act, fireEvent, render } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { AccountMenu } from './account-menu';

jest.mock('@expo/vector-icons/Feather', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('react-native/Libraries/Modal/Modal', () => {
  const MockModal = ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? children : null;

  return { __esModule: true, default: MockModal };
});

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: {
      backgroundElevated: '#0E1116',
      border: '#262626',
      danger: '#EF4444',
      glow: 'rgba(96, 165, 250, 0.18)',
      onPrimary: '#0A0A0A',
      overlay: 'rgba(0, 0, 0, 0.72)',
      primary: '#60A5FA',
      success: '#22C55E',
      surface: '#121212',
      surfaceMuted: '#1A1A1A',
      text: '#EDEDED',
      textMuted: '#A3A3A3',
      textSubtle: '#737373',
    },
  }),
}));

const user = { email: 'matheus@example.com', name: 'Matheus Queiroz' };

describe('AccountMenu', () => {
  it('opens an anchored dropdown on the web', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    try {
      const view = await render(
        <AccountMenu
          onManageUsers={jest.fn()}
          onSignOut={jest.fn().mockResolvedValue(undefined)}
          role="user"
          user={user}
        />,
      );

      fireEvent.press(view.getByRole('button', { name: 'Abrir menu da conta' }));

      const dropdown = await view.findByTestId('account-dropdown');
      expect(StyleSheet.flatten(dropdown.props.style)).toMatchObject({
        position: 'absolute',
        right: 0,
        top: 52,
      });
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });

  it('shows the authenticated account and signs out', async () => {
    const onSignOut = jest.fn().mockResolvedValue(undefined);
    const view = await render(
      <AccountMenu onManageUsers={jest.fn()} onSignOut={onSignOut} role="user" user={user} />,
    );

    fireEvent.press(view.getByRole('button', { name: 'Abrir menu da conta' }));

    expect(await view.findByText('Matheus Queiroz')).toBeTruthy();
    expect(view.getByText('matheus@example.com')).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: 'Sair com segurança' }));
    });

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('keeps the menu open when sign-out fails', async () => {
    const onSignOut = jest.fn().mockRejectedValue(new Error('network unavailable'));
    const view = await render(
      <AccountMenu onManageUsers={jest.fn()} onSignOut={onSignOut} role="user" user={user} />,
    );

    fireEvent.press(view.getByRole('button', { name: 'Abrir menu da conta' }));
    const signOutButton = await view.findByRole('button', { name: 'Sair com segurança' });
    await act(async () => {
      fireEvent.press(signOutButton);
    });

    expect(await view.findByText('Não foi possível encerrar a sessão. Tente novamente.')).toBeTruthy();
  });

  it('offers user management only to administrators', async () => {
    const onManageUsers = jest.fn();
    const view = await render(
      <AccountMenu
        onManageUsers={onManageUsers}
        onSignOut={jest.fn().mockResolvedValue(undefined)}
        role="admin"
        user={user}
      />,
    );

    fireEvent.press(view.getByRole('button', { name: 'Abrir menu da conta' }));
    fireEvent.press(await view.findByRole('button', { name: 'Gerenciar usuários' }));

    expect(onManageUsers).toHaveBeenCalledTimes(1);
  });
});
