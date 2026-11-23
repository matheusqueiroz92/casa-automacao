import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { LoginScreen } from './login-screen';

jest.mock('@/theme/theme-provider', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#0A0A0A',
      backgroundElevated: '#0E1116',
      border: '#262626',
      danger: '#EF4444',
      glow: 'rgba(96, 165, 250, 0.18)',
      onPrimary: '#0A0A0A',
      primary: '#60A5FA',
      surface: '#121212',
      surfaceMuted: '#1A1A1A',
      text: '#EDEDED',
      textMuted: '#A3A3A3',
      textSubtle: '#737373',
    },
    themeName: 'dark',
  }),
}));

describe('LoginScreen', () => {
  it('envia as credenciais informadas', async () => {
    const signIn = jest.fn().mockResolvedValue(undefined);
    const view = await render(<LoginScreen signIn={signIn} />);

    await fireEvent.changeText(view.getByLabelText('E-mail'), 'matheus@example.com');
    await fireEvent.changeText(view.getByLabelText('Senha'), 'uma-senha-segura');
    await fireEvent.press(view.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith({
        email: 'matheus@example.com',
        password: 'uma-senha-segura',
      }),
    );
  });

  it('mantém uma mensagem genérica quando a autenticação falha', async () => {
    const signIn = jest.fn().mockRejectedValue(new Error('credencial inválida'));
    const view = await render(<LoginScreen signIn={signIn} />);

    await fireEvent.changeText(view.getByLabelText('E-mail'), 'matheus@example.com');
    await fireEvent.changeText(view.getByLabelText('Senha'), 'senha-incorreta');
    await fireEvent.press(view.getByRole('button', { name: 'Entrar' }));

    expect(await view.findByText('Não foi possível entrar. Confira os dados e tente novamente.')).toBeTruthy();
  });
});
