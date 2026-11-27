import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import CadastroSocial from '../app/cadastro-social';
import Entrar from '../app/entrar';
import { googleConfigurado } from './BotoesSociais';
import { ErroApi, sessao } from './sessao';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  Redirect: () => null,
  useLocalSearchParams: () => ({ cadastroToken: 'cad-1', nome: 'Bia Nunes', email: 'bia@gmail.com' }),
}));

// O botão real abre o Google; aqui ele entrega direto um id_token de teste.
jest.mock('./BotoesSociais', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native') as typeof import('react-native');
  return {
    googleConfigurado: jest.requireActual<typeof import('./BotoesSociais')>('./BotoesSociais').googleConfigurado,
    BotoesSociais: ({ aoObterToken }: { aoObterToken: (p: object) => void }) => (
      <Pressable accessibilityRole="button" onPress={() => aoObterToken({ provedor: 'GOOGLE', idToken: 'id-1', nonce: 'n-1' })}>
        <Text>Continuar com Google</Text>
      </Pressable>
    ),
  };
});

const tokenDe = (tipo: string) =>
  `x.${btoa(JSON.stringify({ sub: 'u1', tipo, perfil: 'Tutor', permissoes: [] })).replace(/=+$/, '')}.y`;
const respostaFetch = (status: number, corpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const termos = () => Promise.resolve({ data: [], response: new Response(null) } as unknown as Qualquer);

describe('UC-02 FA04 · Login com Google e Apple no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('CT-02-03: deve entrar direto quando a identidade já está ligada', async () => {
    const social = jest.spyOn(sessao, 'entrarSocial').mockResolvedValue({ tipo: 'entrou' });
    await render(<Entrar />);
    await fireEvent.press(screen.getByText('Continuar com Google'));
    expect(social).toHaveBeenCalledWith({ provedor: 'GOOGLE', idToken: 'id-1', nonce: 'n-1' });
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('CT-02-04: deve pedir a senha da conta antes de ligar a identidade', async () => {
    const social = jest
      .spyOn(sessao, 'entrarSocial')
      .mockResolvedValueOnce({ tipo: 'senha', mensagem: 'Confirme a senha da conta para ligar o login com Google.' })
      .mockResolvedValueOnce({ tipo: 'entrou' });
    await render(<Entrar />);
    await fireEvent.press(screen.getByText('Continuar com Google'));
    expect(await screen.findByText('Confirme a senha da conta para ligar o login com Google.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Senha da sua conta do Jaguara'), 'senhaForte1');
    await fireEvent.press(screen.getByText('Ligar e entrar'));
    expect(social).toHaveBeenLastCalledWith({ provedor: 'GOOGLE', idToken: 'id-1', nonce: 'n-1', senha: 'senhaForte1' });
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('deve levar ao fim do cadastro no primeiro acesso', async () => {
    jest
      .spyOn(sessao, 'entrarSocial')
      .mockResolvedValue({ tipo: 'cadastro', cadastroToken: 'cad-1', nome: 'Bia Nunes', email: 'bia@gmail.com' });
    await render(<Entrar />);
    await fireEvent.press(screen.getByText('Continuar com Google'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/cadastro-social',
      params: { cadastroToken: 'cad-1', nome: 'Bia Nunes', email: 'bia@gmail.com' },
    });
  });

  it('deve concluir o cadastro com CPF e aceite e entrar', async () => {
    jest.spyOn(api, 'GET').mockImplementation(termos as never);
    const concluir = jest.spyOn(sessao, 'concluirCadastroSocial').mockResolvedValue(undefined);
    await render(<CadastroSocial />);
    expect(screen.getByDisplayValue('Bia Nunes')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Criar conta'));
    expect(await screen.findByText('CPF inválido. Confira os números.')).toBeOnTheScreen();
    expect(concluir).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('CPF'), '529.982.247-25');
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Criar conta'));
    expect(concluir).toHaveBeenCalledWith({ cadastroToken: 'cad-1', nome: 'Bia Nunes', cpf: '52998224725', aceiteTermos: true });
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('deve avisar quando o tempo do cadastro acabou', async () => {
    jest.spyOn(api, 'GET').mockImplementation(termos as never);
    jest.spyOn(sessao, 'concluirCadastroSocial').mockRejectedValue(new ErroApi({ codigo: 'LINK_EXPIRADO' }));
    await render(<CadastroSocial />);
    await fireEvent.changeText(screen.getByLabelText('CPF'), '52998224725');
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Criar conta'));
    expect(await screen.findByText(/O tempo para concluir o cadastro acabou/)).toBeOnTheScreen();
  });

  it('a sessão deve traduzir 428, 409 e 200 e recusar conta que não é de tutor', async () => {
    const fetchFalso = jest.spyOn(globalThis, 'fetch');
    fetchFalso.mockImplementationOnce(() => respostaFetch(428, { cadastroToken: 'c', email: 'bia@gmail.com' }));
    await expect(sessao.entrarSocial({ provedor: 'GOOGLE', idToken: 'i', nonce: 'n' })).resolves.toEqual({
      tipo: 'cadastro',
      cadastroToken: 'c',
      email: 'bia@gmail.com',
    });
    fetchFalso.mockImplementationOnce(() => respostaFetch(409, { title: 'Este e-mail já tem conta', detail: 'Confirme a senha.' }));
    await expect(sessao.entrarSocial({ provedor: 'GOOGLE', idToken: 'i', nonce: 'n' })).resolves.toEqual({
      tipo: 'senha',
      mensagem: 'Confirme a senha.',
    });
    fetchFalso
      .mockImplementationOnce(() => respostaFetch(200, { accessToken: tokenDe('EMPRESA'), refreshToken: 'r', expiraEm: 'x' }))
      .mockImplementationOnce(() => respostaFetch(204, {}));
    await expect(sessao.entrarSocial({ provedor: 'GOOGLE', idToken: 'i', nonce: 'n' })).rejects.toThrow(/tutores/);
  });

  it('o botão do Google só aparece com o ID de cliente da plataforma', () => {
    expect(googleConfigurado('android')).toBe(false);
  });
});
