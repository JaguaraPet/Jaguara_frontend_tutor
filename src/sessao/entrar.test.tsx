import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import Entrar, { mensagemDoErro } from '../app/entrar';
import { ErroApi, sessao } from './sessao';
import type { Usuario } from './sessao';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  Redirect: () => null,
}));

const tutor: Usuario = { id: 't1', tipo: 'TUTOR', perfil: 'Tutor', permissoes: [] };

describe('UC-02 · Login do tutor no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve entrar com e-mail normalizado e ir para o início', async () => {
    const entrar = jest.spyOn(sessao, 'entrar').mockResolvedValue(tutor);
    await render(<Entrar />);
    await fireEvent.changeText(screen.getByLabelText('E-mail'), ' Ana@Exemplo.com ');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'senhaForte1');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(entrar).toHaveBeenCalledWith('ana@exemplo.com', 'senhaForte1');
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('deve pedir e-mail e senha antes de chamar a API', async () => {
    const entrar = jest.spyOn(sessao, 'entrar');
    await render(<Entrar />);
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Informe o e-mail e a senha.')).toBeOnTheScreen();
    expect(entrar).not.toHaveBeenCalled();
  });

  it('deve mostrar o motivo da recusa (RN03)', async () => {
    jest
      .spyOn(sessao, 'entrar')
      .mockRejectedValue(new ErroApi({ codigo: 'RN03_CONTA_BLOQUEADA' }));
    await render(<Entrar />);
    await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'errada');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText(/bloqueada por 5 minutos/)).toBeOnTheScreen();
  });

  it('deve explicar cada código de erro do login', () => {
    expect(mensagemDoErro(new ErroApi({ codigo: 'CREDENCIAIS_INVALIDAS' }))).toBe(
      'E-mail ou senha incorretos.',
    );
    expect(mensagemDoErro(new ErroApi({ codigo: 'RN02_EMAIL_NAO_CONFIRMADO' }))).toContain(
      'Confirme seu e-mail',
    );
    expect(mensagemDoErro(new ErroApi({ codigo: 'SO_TUTOR' }))).toContain('Enterprise');
    expect(mensagemDoErro(new Error('rede'))).toContain('internet');
  });
});
