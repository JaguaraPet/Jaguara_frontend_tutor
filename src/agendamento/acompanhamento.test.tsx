import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import DetalheDaSolicitacao from '../app/solicitacoes/[solicitacaoId]';
import { podePagar, rotuloStatus } from './acompanhamento';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ solicitacaoId: 's1' }),
}));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const aceita: components['schemas']['DetalheSolicitacao'] = {
  id: 's1',
  status: 'ACEITA',
  dataHoraDesejada: '2099-11-28T13:00:00Z',
  servico: { id: 'sv', nome: 'Banho', preco: 60, duracaoMinutos: 60 },
  empresa: { id: 'e1', nome: 'Patas' },
  pet: { id: 'p1', nome: 'Thor' },
  agendamento: { id: 'a1', dataHoraInicio: '2099-11-28T13:00:00Z', precoContratado: 60, status: 'AGENDADO' },
  podeCancelar: true,
  historico: [{ dataHora: '2026-11-25T12:00:00Z', statusNovo: 'ACEITA', autor: 'Patas' }],
};

describe('UC-42 · Minhas solicitações no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve montar o status e saber quando pode pagar', () => {
    expect(rotuloStatus(aceita)).toBe('Confirmada');
    expect(podePagar(aceita)).toBe(true);
    const paga = { ...aceita, agendamento: { ...aceita.agendamento!, pagamento: 'ACEITO' as const } };
    expect(rotuloStatus(paga)).toBe('Confirmada e paga');
    expect(podePagar(paga)).toBe(false);
  });

  it('CT-42-01: deve mostrar o histórico, levar ao pagamento e cancelar', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta(aceita) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta(null, 204) as never);
    await render(<DetalheDaSolicitacao />);
    expect(await screen.findByText(/Patas$/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Pagar' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/pagar/[agendamentoId]',
      params: { agendamentoId: 'a1', servico: 'Banho', valor: '60' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar solicitação' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    expect(post).toHaveBeenCalledWith('/solicitacoes/{solicitacaoId}/cancelamento', { params: { path: { solicitacaoId: 's1' } } });
    expect(await screen.findByText('Solicitação cancelada')).toBeOnTheScreen();
  });

  it('CT-42-02: deve explicar quando o horário já passou', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() =>
      resposta({ ...aceita, podeCancelar: false, motivoSemCancelamento: 'O horário desta solicitação já passou.' }) as never,
    );
    await render(<DetalheDaSolicitacao />);
    expect(await screen.findByText('O horário desta solicitação já passou.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cancelar solicitação' })).toBeNull();
  });
});
