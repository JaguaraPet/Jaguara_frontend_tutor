import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import { api } from '../api/cliente';
import Privacidade from '../app/privacidade';
import TermosPendentes from '../app/termos-pendentes';
import { sessao } from '../sessao/sessao';
import { pendentes } from './termos';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('expo-file-system', () => {
  class FileFalso {
    uri = 'file:///cache/meus-dados-jaguara.json';
    exists = false;
    delete = jest.fn();
    create = jest.fn();
    write = jest.fn();
  }
  return { File: FileFalso, Paths: { cache: 'file:///cache' } };
});
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(() => Promise.resolve()) }));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const termos = [
  { termoId: 'tu', titulo: 'Termos de uso', versao: '2.0', obrigatorio: true, aceito: true, dataAceite: '2026-11-01T12:00:00Z' },
  { termoId: 'mk', titulo: 'Comunicação de marketing', versao: '1.0', obrigatorio: false, aceito: true },
];

function api_() {
  jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
    caminho === '/privacidade/exportacao' ? resposta({ usuario: { nome: 'Ana' }, pets: [] }) : resposta(termos)) as never);
}

describe('UC-46 · Privacidade e consentimentos no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('CT-46-01: deve revogar o consentimento opcional de marketing', async () => {
    api_();
    const put = jest.spyOn(api, 'PUT').mockImplementation(() => resposta(undefined, 204) as never);
    await render(<Privacidade />);
    await fireEvent(await screen.findByLabelText('Aceito: Comunicação de marketing'), 'valueChange', false);
    expect(put).toHaveBeenCalledWith('/privacidade/consentimentos', { body: [{ termoId: 'mk', aceito: false }] });
    expect(await screen.findByText('Consentimento revogado')).toBeOnTheScreen();
  });

  it('CT-46-02: deve avisar que o termo obrigatório só sai com a exclusão da conta', async () => {
    api_();
    jest
      .spyOn(api, 'PUT')
      .mockImplementation(() => resposta({ title: 'Termo obrigatório', detail: 'Para revogar, exclua a conta.' }, 409) as never);
    await render(<Privacidade />);
    await fireEvent(await screen.findByLabelText('Aceito: Termos de uso'), 'valueChange', false);
    expect(await screen.findByText('Este termo é necessário para usar o Jaguara')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sua senha para confirmar')).toBeOnTheScreen();
  });

  it('deve exportar os dados em JSON e abrir o compartilhamento', async () => {
    api_();
    await render(<Privacidade />);
    await fireEvent.press(await screen.findByText('Exportar meus dados'));
    expect(shareAsync).toHaveBeenCalledWith(
      'file:///cache/meus-dados-jaguara.json',
      expect.objectContaining({ mimeType: 'application/json' }),
    );
  });

  it('deve excluir a conta com a senha e encerrar a sessão', async () => {
    api_();
    const post = jest
      .spyOn(api, 'POST')
      .mockImplementation(() => resposta({ id: 's1', tipo: 'EXCLUSAO_DADOS', status: 'CONCLUIDA' }, 202) as never);
    const sair = jest.spyOn(sessao, 'sair').mockResolvedValue(undefined);
    await render(<Privacidade />);
    await fireEvent.press(await screen.findByText('Quero excluir minha conta'));
    await fireEvent.changeText(screen.getByLabelText('Sua senha para confirmar'), 'Senha@123');
    await fireEvent.press(screen.getByText('Confirmar exclusão'));
    expect(post).toHaveBeenCalledWith('/privacidade/solicitacoes', { body: { tipo: 'EXCLUSAO_DADOS', senha: 'Senha@123' } });
    expect(sair).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/boas-vindas');
  });

  it('deve manter a conta quando a senha está errada', async () => {
    api_();
    jest.spyOn(api, 'POST').mockImplementation(() => resposta({ title: 'Senha incorreta' }, 422) as never);
    await render(<Privacidade />);
    await fireEvent.press(await screen.findByText('Quero excluir minha conta'));
    await fireEvent.changeText(screen.getByLabelText('Sua senha para confirmar'), 'errada');
    await fireEvent.press(screen.getByText('Confirmar exclusão'));
    expect(await screen.findByText('Conta não excluída')).toBeOnTheScreen();
  });

  it('CT-46-03: deve aceitar a versão nova do termo obrigatório e seguir para o início', async () => {
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/termos/vigentes'
        ? resposta([{ id: 'tu3', titulo: 'Termos de uso', versao: '3.0', conteudo: 'Texto da versão 3.0.' }])
        : resposta([{ termoId: 'tu3', titulo: 'Termos de uso', versao: '3.0', obrigatorio: true, aceito: false }, termos[1]])) as never);
    const put = jest.spyOn(api, 'PUT').mockImplementation(() => resposta(undefined, 204) as never);
    await render(<TermosPendentes />);
    expect(await screen.findByText('Texto da versão 3.0.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Li e aceito'));
    expect(put).toHaveBeenCalledWith('/privacidade/consentimentos', { body: [{ termoId: 'tu3', aceito: true }] });
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('deve listar só os obrigatórios ainda não aceitos', () => {
    const lista = [{ termoId: 'a', obrigatorio: true, aceito: false }, { termoId: 'b', obrigatorio: false, aceito: false }, termos[0]!];
    expect(pendentes(lista)).toEqual([{ termoId: 'a', obrigatorio: true, aceito: false }]);
  });
});
