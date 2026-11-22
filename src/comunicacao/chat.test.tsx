import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import ChatEmpresa, { ATUALIZAR_MS } from '../app/chat/[empresaId]';
import { sessao } from '../sessao/sessao';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ empresaId: 'e1', empresa: 'Patas' }),
}));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

describe('UC-43 · Chat com a empresa no app', () => {
  beforeEach(() => {
    jest.spyOn(sessao, 'usuario', 'get').mockReturnValue({ id: 't1', tipo: 'TUTOR', perfil: 'Tutor', permissoes: [] });
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('CT-43-01: deve enviar a mensagem e mostrar a resposta da empresa', async () => {
    jest.useFakeTimers();
    const minha = { id: 'm1', conteudo: 'Vocês abrem sábado?', remetenteId: 't1', dataHoraEnvio: '2026-11-22T13:00:00Z' };
    const dela = { id: 'm2', conteudo: 'Abrimos das 8h às 12h.', remetenteId: 'e1', dataHoraEnvio: '2026-11-22T13:02:00Z' };
    const post = jest.spyOn(api, 'POST').mockImplementation(((caminho: string) =>
      caminho === '/conversas' ? resposta({ id: 'c1', tipo: 'EMPRESA', status: 'ABERTA' }, 201) : resposta(minha, 201)) as never);
    jest
      .spyOn(api, 'GET')
      .mockImplementationOnce(() => resposta([]) as never)
      .mockImplementation(() => resposta([dela, minha]) as never);
    await render(<ChatEmpresa />);
    expect(await screen.findByText(/Escreva sua dúvida/)).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Sua mensagem'), 'Vocês abrem sábado?');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Vocês abrem sábado?')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/conversas', { body: { tipo: 'EMPRESA', empresaId: 'e1' } });
    expect(post).toHaveBeenCalledWith('/conversas/{conversaId}/mensagens', {
      params: { path: { conversaId: 'c1' } },
      body: { conteudo: 'Vocês abrem sábado?' },
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ATUALIZAR_MS);
    });
    expect(await screen.findByText('Abrimos das 8h às 12h.')).toBeOnTheScreen();
  });

  it('deve avisar quando o tutor não tem vínculo com a empresa', async () => {
    jest
      .spyOn(api, 'POST')
      .mockImplementation(() =>
        resposta({ title: 'Acesso negado', detail: 'Você conversa com empresas em que é cliente ou tem agendamento.' }, 403) as never,
      );
    await render(<ChatEmpresa />);
    expect(await screen.findByText('Chat indisponível')).toBeOnTheScreen();
    expect(screen.getByText('Você conversa com empresas em que é cliente ou tem agendamento.')).toBeOnTheScreen();
  });
});
