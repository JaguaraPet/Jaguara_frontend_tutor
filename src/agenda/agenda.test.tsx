import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import Agenda from '../app/(abas)/agenda';
import NovoEvento from '../app/eventos/novo';
import { mascararHora, montarEvento, porDia } from './agenda';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ petId: 'p1' }),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (efeito: () => void) => require('react').useEffect(efeito, [efeito]),
}));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const valores = {
  titulo: 'Consulta de rotina',
  tipo: 'CONSULTA' as const,
  data: '28/11/2026',
  inicio: '10:00',
  fim: '',
  local: '',
  descricao: '',
};

describe('UC-10 · Agenda e eventos no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve montar o evento no fuso de Brasília e validar', () => {
    const agora = new Date('2026-11-23T12:00:00Z');
    const ok = montarEvento(valores, agora);
    expect(ok).toEqual({
      ok: true,
      corpo: { titulo: 'Consulta de rotina', tipo: 'CONSULTA', dataHoraInicio: '2026-11-28T13:00:00.000Z' },
    });
    const passado = montarEvento({ ...valores, data: '01/11/2026' }, agora);
    expect(passado.ok ? null : passado.erros.data).toMatch(/a partir de agora/);
    const fim = montarEvento({ ...valores, fim: '09:00' }, agora);
    expect(fim.ok ? null : fim.erros.fim).toMatch(/depois do início/);
    expect(mascararHora('1030')).toBe('10:30');
    expect(porDia([{ dataHoraInicio: '2026-11-29T02:00:00Z' }, { dataHoraInicio: '2026-11-28T13:00:00Z' }]).map((g) => g.dia)).toEqual([
      '2026-11-28',
    ]);
  });

  it('deve listar os eventos por dia e excluir o manual', async () => {
    const del = jest.spyOn(api, 'DELETE').mockImplementation(() => resposta(null, 204) as never);
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/pets'
        ? resposta({ itens: [{ id: 'p1', nome: 'Thor', status: 'ATIVO' }], total: 1, pagina: 1 })
        : resposta([
            { id: 'e1', titulo: 'Banho', tipo: 'BANHO_TOSA', origem: 'AGENDAMENTO', dataHoraInicio: '2026-11-28T13:00:00Z' },
            { id: 'e2', titulo: 'Remédio', tipo: 'MEDICAMENTO', origem: 'MANUAL', dataHoraInicio: '2026-11-28T18:00:00Z' },
          ])) as never);
    await render(<Agenda />);
    expect(await screen.findByText('10:00 · Banho')).toBeOnTheScreen();
    expect(screen.getByText('Banho e tosa · Agendamento com empresa')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Excluir Banho' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir Remédio' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));
    expect(del).toHaveBeenCalledWith('/eventos/{eventoId}', { params: { path: { eventoId: 'e2' } } });
    await fireEvent.press(screen.getByRole('button', { name: 'Novo evento' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/eventos/novo', params: { petId: 'p1' } });
  });

  it('CT-10-01: deve criar a consulta e voltar para a agenda', async () => {
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta({ id: 'e3' }, 201) as never);
    await render(<NovoEvento />);
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Consulta de rotina');
    await fireEvent.changeText(screen.getByLabelText('Data (DD/MM/AAAA)'), '28112099');
    await fireEvent.changeText(screen.getByLabelText('Início (HH:MM)'), '1000');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar evento' }));
    expect(post).toHaveBeenCalledWith('/pets/{petId}/eventos', {
      params: { path: { petId: 'p1' } },
      body: { titulo: 'Consulta de rotina', tipo: 'CONSULTA', dataHoraInicio: '2099-11-28T13:00:00.000Z' },
    });
    expect(router.back).toHaveBeenCalled();
  });

  it('CT-10-02: deve mostrar o conflito de horário do pet', async () => {
    jest
      .spyOn(api, 'POST')
      .mockImplementation(() => resposta({ title: 'O pet já tem um compromisso neste horário.' }, 409) as never);
    await render(<NovoEvento />);
    await fireEvent.changeText(screen.getByLabelText('Título'), 'Outra consulta');
    await fireEvent.changeText(screen.getByLabelText('Data (DD/MM/AAAA)'), '28112099');
    await fireEvent.changeText(screen.getByLabelText('Início (HH:MM)'), '1000');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar evento' }));
    expect(await screen.findByText('O pet já tem um compromisso neste horário.')).toBeOnTheScreen();
  });
});
