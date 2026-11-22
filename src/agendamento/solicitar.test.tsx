import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import SolicitarAgendamento from '../app/solicitar/[servicoId]';
import { horaBrasilia, proximosDias, rotuloDia } from './solicitar';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ servicoId: 's1', servico: 'Banho', empresa: 'Patas' }),
}));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const quinze = '2026-11-25T18:00:00.000Z';
const dezesseis = '2026-11-25T19:00:00.000Z';

describe('UC-40 · Solicitar agendamento no app', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-22T12:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('deve montar os dias e as horas no fuso de Brasília', () => {
    const dias = proximosDias('2026-11-30', 3);
    expect(dias).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
    expect(rotuloDia('2026-11-25')).toMatch(/25\/11$/);
    expect(horaBrasilia(quinze)).toBe('15:00');
  });

  function apiGet(horarios: () => string[]) {
    return jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/pets'
        ? resposta({ itens: [{ id: 'p1', nome: 'Thor', status: 'ATIVO' }], total: 1, pagina: 1 })
        : resposta(horarios())) as never);
  }

  it('CT-40-01: deve enviar a solicitação para o horário livre', async () => {
    apiGet(() => [quinze, dezesseis]);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta({ id: 'sol1', status: 'PENDENTE' }, 201) as never);
    await render(<SolicitarAgendamento />);
    expect(await screen.findByRole('radio', { name: 'Thor' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: rotuloDia('2026-11-25') }));
    await fireEvent.press(await screen.findByRole('radio', { name: '15:00' }));
    await fireEvent.changeText(screen.getByLabelText('Observações (opcional)'), 'Pelo longo');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar solicitação' }));
    expect(await screen.findByText('Pedido enviado à empresa')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/solicitacoes', {
      body: { servicoId: 's1', petId: 'p1', dataHoraDesejada: quinze, observacoes: 'Pelo longo' },
    });
  });

  it('CT-40-02: deve avisar o conflito e atualizar os horários', async () => {
    let livres = [quinze, dezesseis];
    const get = apiGet(() => livres);
    jest.spyOn(api, 'POST').mockImplementation(() => {
      livres = [dezesseis];
      return resposta({ title: 'Horário indisponível' }, 409) as never;
    });
    await render(<SolicitarAgendamento />);
    await screen.findByRole('radio', { name: 'Thor' });
    await fireEvent.press(screen.getByRole('radio', { name: rotuloDia('2026-11-25') }));
    await fireEvent.press(await screen.findByRole('radio', { name: '15:00' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar solicitação' }));
    expect(await screen.findByText(/acabou de ser ocupado/)).toBeOnTheScreen();
    expect(await screen.findByRole('radio', { name: '16:00' })).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: '15:00' })).toBeNull();
    const consultas = (get.mock.calls as unknown as string[][]).filter((c) => c[0].includes('horarios-disponiveis'));
    expect(consultas).toHaveLength(2);
  });
});
