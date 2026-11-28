import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import Medicamentos from '../app/pets/[petId]/medicamentos';
import { montarTratamento, resumoTratamento } from './tratamento';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ petId: 'p1' }),
}));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const base = {
  medicamento: 'Amoxicilina',
  dosagem: '1 comprimido',
  via: 'Oral',
  intervalo: '8',
  inicio: '23/11/2026',
  fim: '30/11/2026',
  primeiraDose: '08:00',
  observacoes: '',
};

describe('UC-14 · Medicamentos do pet no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve montar o tratamento e validar as datas', () => {
    expect(montarTratamento(base, '2026-11-23')).toEqual({
      ok: true,
      corpo: {
        medicamento: 'Amoxicilina',
        dosagem: '1 comprimido',
        viaAdministracao: 'Oral',
        intervaloHoras: 8,
        dataInicio: '2026-11-23',
        dataFim: '2026-11-30',
        horaPrimeiraDose: '08:00',
      },
    });
    const errado = montarTratamento({ ...base, fim: '20/11/2026', primeiraDose: '25:00' }, '2026-11-23');
    expect(errado.ok ? [] : Object.keys(errado.erros).sort()).toEqual(['fim', 'primeiraDose']);
    expect(resumoTratamento({ intervaloHoras: 24, dataInicio: '2026-11-23' })).toBe('Uma vez por dia · desde 23/11/2026');
  });

  it('CT-14-01: deve cadastrar o remédio de 8 em 8 horas e informar os lembretes', async () => {
    let lista: unknown[] = [];
    jest.spyOn(api, 'GET').mockImplementation(() => resposta(lista) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => {
      lista = [{ id: 't1', medicamento: 'Amoxicilina', dosagem: '1 comprimido', intervaloHoras: 8, dataInicio: '2099-11-23', status: 'ATIVO', viaAdministracao: 'Oral' }];
      return resposta({ id: 't1', lembretesAgendados: 21 }, 201) as never;
    });
    await render(<Medicamentos />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Novo medicamento' }));
    await fireEvent.changeText(screen.getByLabelText('Medicamento'), 'Amoxicilina');
    await fireEvent.changeText(screen.getByLabelText('Dose'), '1 comprimido');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Quando dar')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Início (DD/MM/AAAA)'), '23112099');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar medicamento' }));
    expect(await screen.findByText('21 lembretes de dose agendados para os responsáveis.')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/pets/{petId}/tratamentos', {
      params: { path: { petId: 'p1' } },
      body: {
        medicamento: 'Amoxicilina',
        dosagem: '1 comprimido',
        viaAdministracao: 'Oral',
        intervaloHoras: 8,
        dataInicio: '2099-11-23',
        horaPrimeiraDose: '08:00',
      },
    });
    expect(await screen.findByText('Amoxicilina · 1 comprimido')).toBeOnTheScreen();
  });

  it('CT-14-02: deve finalizar e avisar que os lembretes foram cancelados', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() =>
      resposta([{ id: 't1', medicamento: 'Amoxicilina', dosagem: '1 comprimido', intervaloHoras: 8, dataInicio: '2026-11-20', status: 'ATIVO' }]) as never,
    );
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta(null, 204) as never);
    await render(<Medicamentos />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Finalizar Amoxicilina' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Finalizar' }));
    expect(await screen.findByText(/lembretes que ainda não saíram foram cancelados/)).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/tratamentos/{tratamentoId}/finalizacao', { params: { path: { tratamentoId: 't1' } } });
  });
});
