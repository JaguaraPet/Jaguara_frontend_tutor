import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import Vacinas from '../app/pets/[petId]/vacinas';
import { montarVacina } from './vacina';

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
  nome: 'V10',
  fabricante: '',
  lote: '',
  aplicacao: '10/11/2026',
  proximaDose: '10/11/2027',
  responsavel: 'Dra. Júlia',
  observacoes: '',
};

describe('UC-12 e UC-13 · Vacinas no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve montar a vacinação e exigir o responsável', () => {
    expect(montarVacina(base, '2026-11-24')).toEqual({
      ok: true,
      corpo: {
        nomeVacina: 'V10',
        dataAplicacao: '2026-11-10',
        dataProximaDose: '2027-11-10',
        responsavelAplicacao: 'Dra. Júlia',
      },
    });
    const futura = montarVacina({ ...base, aplicacao: '30/11/2026' }, '2026-11-24');
    expect(futura.ok ? null : futura.erros.aplicacao).toMatch(/futura/);
    const dose = montarVacina({ ...base, proximaDose: '01/11/2026' }, '2026-11-24');
    expect(dose.ok ? null : dose.erros.proximaDose).toMatch(/depois da aplicação/);
  });

  it('CT-12-01: deve listar as vacinas válidas e a próxima dose', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() =>
      resposta([
        { id: 'v1', nomeVacina: 'V10', dataAplicacao: '2025-11-01', responsavelAplicacao: 'Dra. Júlia' },
        { id: 'v2', nomeVacina: 'Raiva', dataAplicacao: '2026-03-01', responsavelAplicacao: 'Clínica Patas', dataProximaDose: '2099-03-01' },
      ]) as never,
    );
    await render(<Vacinas />);
    expect(await screen.findByText('V10')).toBeOnTheScreen();
    expect(screen.getByText('Aplicada em 01/03/2026 por Clínica Patas')).toBeOnTheScreen();
    expect(screen.getByText('Próxima dose: Raiva')).toBeOnTheScreen();
  });

  it('CT-13-01 e CT-13-02: deve exigir o responsável e registrar a vacina', async () => {
    let lista: unknown[] = [];
    jest.spyOn(api, 'GET').mockImplementation(() => resposta(lista) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => {
      lista = [{ id: 'v3', nomeVacina: 'V10', dataAplicacao: '2026-11-10', responsavelAplicacao: 'Dra. Júlia' }];
      return resposta(lista[0], 201) as never;
    });
    await render(<Vacinas />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Registrar vacina' }));
    await fireEvent.changeText(screen.getByLabelText('Vacina'), 'V10');
    await fireEvent.changeText(screen.getByLabelText('Data da aplicação (DD/MM/AAAA)'), '10112026');
    await fireEvent.changeText(screen.getByLabelText('Próxima dose (opcional)'), '10112027');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar vacina' }));
    expect(screen.getByText('Informe quem aplicou a vacina.')).toBeOnTheScreen();
    expect(post).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Quem aplicou'), 'Dra. Júlia');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar vacina' }));
    expect(await screen.findByText(/lembrete às 9h do dia anterior/)).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/pets/{petId}/vacinacoes', {
      params: { path: { petId: 'p1' } },
      body: {
        nomeVacina: 'V10',
        dataAplicacao: '2026-11-10',
        dataProximaDose: '2027-11-10',
        responsavelAplicacao: 'Dra. Júlia',
      },
    });
  });
});
