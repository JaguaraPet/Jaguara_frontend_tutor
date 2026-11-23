import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import Cadastro from '../app/cadastro';
import { cpfValido, errosDoCadastro, problemaNaSenha } from './cadastro';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

type Qualquer = Awaited<ReturnType<typeof api.POST>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

async function preencher() {
  await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Ana Ribeiro');
  await fireEvent.changeText(screen.getByLabelText('CPF'), '529.982.247-25');
  await fireEvent.changeText(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
  await fireEvent.changeText(screen.getByLabelText('Senha'), 'senhaForte1');
  await fireEvent.changeText(screen.getByLabelText('Repita a senha'), 'senhaForte1');
}

describe('UC-01 · Cadastro do tutor no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  function termos() {
    jest.spyOn(api, 'GET').mockImplementation(((_caminho: string, opcoes: { params: { query: { tipo: string } } }) =>
      resposta(
        opcoes.params.query.tipo === 'TERMOS_USO_APP'
          ? [{ id: 't1', titulo: 'Termos de uso', versao: '1.0', conteudo: 'Texto dos termos' }]
          : [{ id: 't2', titulo: 'Política de privacidade', versao: '1.0', conteudo: 'Texto da política' }],
      )) as never);
  }

  it('deve validar CPF, senha e campos', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(problemaNaSenha('senha')).toMatch(/8 caracteres/);
    expect(problemaNaSenha('somenteletras')).toMatch(/letras e números/);
    const erros = errosDoCadastro({
      nome: 'Ana',
      cpf: '1',
      email: 'ana',
      telefone: '123',
      senha: 'senhaForte1',
      repeticao: 'outra',
      aceite: false,
    });
    expect(Object.keys(erros).sort()).toEqual(['aceite', 'cpf', 'email', 'nome', 'repeticao', 'telefone']);
  });

  it('CT-01-01: deve criar a conta e pedir a confirmação do e-mail', async () => {
    termos();
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta({ id: 'u1', status: 'PENDENTE_CONFIRMACAO' }, 201) as never);
    await render(<Cadastro />);
    await fireEvent.press(await screen.findByRole('button', { name: /Termos de uso/ }));
    expect(screen.getByText('Texto dos termos')).toBeOnTheScreen();
    await preencher();
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(screen.getByText(/aceite os termos de uso/)).toBeOnTheScreen();
    expect(post).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Conta criada')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/auth/cadastro/tutor', {
      body: { nome: 'Ana Ribeiro', cpf: '52998224725', email: 'ana@exemplo.com', senha: 'senhaForte1', aceiteTermos: true },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Ir para o login' }));
    expect(router.replace).toHaveBeenCalledWith('/entrar');
  });

  it('CT-01-02: deve avisar que o e-mail já tem cadastro', async () => {
    termos();
    jest.spyOn(api, 'POST').mockImplementation(() => resposta({ title: 'Este e-mail já tem cadastro no Jaguara.' }, 409) as never);
    await render(<Cadastro />);
    await preencher();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
    expect(await screen.findByText('Este e-mail já tem cadastro no Jaguara.')).toBeOnTheScreen();
  });
});
