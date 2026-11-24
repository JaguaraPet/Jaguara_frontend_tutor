import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { openAuthSessionAsync } from 'expo-web-browser';
import { api } from '../api/cliente';
import Calendario from '../app/calendario';
import { avisoDoRetorno } from './calendario';

let mockParametros: { resultado?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParametros,
}));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(() =>
    Promise.resolve({ type: 'success', url: 'jaguara://calendario?resultado=conectado' }),
  ),
}));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const thor = { id: 'p1', nome: 'Thor', status: 'ATIVO', sexo: 'MACHO', castrado: true };

function api_(conectado: boolean) {
  jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
    caminho === '/pets'
      ? resposta({ itens: [thor], total: 1, pagina: 1 })
      : resposta(conectado ? { provedor: 'GOOGLE', conta: 'ana@gmail.com', autorizado: true } : null)) as never);
}

describe('UC-09 · Google Agenda no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
    mockParametros = {};
  });

  it('deve abrir o consentimento do Google e mostrar o resultado da volta', async () => {
    api_(false);
    jest
      .spyOn(api, 'POST')
      .mockImplementation(() => resposta({ url: 'https://accounts.google.com/o/oauth2/v2/auth?state=x' }, 201) as never);
    await render(<Calendario />);
    await fireEvent.press(await screen.findByText('Conectar Google Agenda'));
    expect(openAuthSessionAsync).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?state=x', 'jaguara://calendario');
    expect(await screen.findByText('Google Agenda conectado')).toBeOnTheScreen();
  });

  it('CT-09-01: deve sincronizar a agenda do pet e mostrar o resumo', async () => {
    api_(true);
    const post = jest
      .spyOn(api, 'POST')
      .mockImplementation(() => resposta({ importados: 3, atualizados: 1, removidos: 0 }, 201) as never);
    await render(<Calendario />);
    expect(await screen.findByText('Conectado: ana@gmail.com')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Sincronizar agora'));
    expect(post).toHaveBeenCalledWith('/pets/{petId}/calendario-externo/sincronizacao', { params: { path: { petId: 'p1' } } });
    expect(await screen.findByText(/3 novos, 1 atualizados e 0 removidos/)).toBeOnTheScreen();
  });

  it('CT-09-02: deve avisar quando o tutor nega o acesso', async () => {
    mockParametros = { resultado: 'negado' };
    api_(false);
    await render(<Calendario />);
    expect(await screen.findByText('Acesso não autorizado')).toBeOnTheScreen();
  });

  it('deve desconectar depois de confirmar', async () => {
    api_(true);
    const del = jest.spyOn(api, 'DELETE').mockImplementation(() => resposta(undefined, 204) as never);
    await render(<Calendario />);
    await fireEvent.press(await screen.findByText('Desconectar'));
    await fireEvent.press(screen.getByText('Confirmar desconexão'));
    expect(del).toHaveBeenCalledWith('/calendario-externo');
    expect(await screen.findByText('Google Agenda desconectado')).toBeOnTheScreen();
  });

  it('deve traduzir só os resultados conhecidos', () => {
    expect(avisoDoRetorno('erro')?.tipo).toBe('erro');
    expect(avisoDoRetorno('outro')).toBeNull();
  });
});
