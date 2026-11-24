import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import RecuperarSenha from '../app/recuperar-senha';
import RedefinirSenha from '../app/redefinir-senha';

const parametros: { token?: string } = { token: 'token-do-email' };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => parametros,
}));

type Qualquer = Awaited<ReturnType<typeof api.POST>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

describe('UC-03 · Recuperação de senha no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve pedir o link e mostrar a mesma resposta para qualquer e-mail', async () => {
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta(null, 202) as never);
    await render(<RecuperarSenha />);
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar link' }));
    expect(screen.getByText('Informe um e-mail válido.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByText('Pedido recebido')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/auth/senha/recuperacao', { body: { email: 'ana@exemplo.com' } });
  });

  it('CT-03-01: deve salvar a senha nova com o token do link', async () => {
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta(null, 204) as never);
    await render(<RedefinirSenha />);
    await fireEvent.changeText(screen.getByLabelText('Nova senha'), 'novaSenha2');
    await fireEvent.changeText(screen.getByLabelText('Repita a nova senha'), 'outra');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(screen.getByText('As senhas não são iguais.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Repita a nova senha'), 'novaSenha2');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText('Senha alterada')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/auth/senha/redefinicao', {
      body: { token: 'token-do-email', novaSenha: 'novaSenha2' },
    });
  });

  it('CT-03-02: deve orientar a pedir outro link quando o token venceu', async () => {
    jest.spyOn(api, 'POST').mockImplementation(() => resposta({ title: 'Link inválido ou expirado' }, 410) as never);
    await render(<RedefinirSenha />);
    await fireEvent.changeText(screen.getByLabelText('Nova senha'), 'novaSenha2');
    await fireEvent.changeText(screen.getByLabelText('Repita a nova senha'), 'novaSenha2');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar nova senha' }));
    expect(await screen.findByText(/Peça um novo link/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pedir novo link' })).toBeOnTheScreen();
  });

  it('deve avisar quando o link chega sem token', async () => {
    delete parametros.token;
    await render(<RedefinirSenha />);
    expect(screen.getByText('Link incompleto')).toBeOnTheScreen();
    parametros.token = 'token-do-email';
  });
});
