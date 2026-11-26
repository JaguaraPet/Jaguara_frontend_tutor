import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import Alimentacao from '../app/pets/[petId]/alimentacao';

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

const plano = { id: 'pl', alimento: 'Ração', metaDiariaGramas: 250, limiteDiarioGramas: 300, refeicoesPorDia: 2 };

describe('UC-08 · Alimentação no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  function api_(consumo: number) {
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/pets/{petId}/plano-alimentar'
        ? resposta({ plano })
        : resposta({
            data: '2026-11-25',
            consumoDoDia: consumo,
            metaDiariaGramas: 250,
            limiteDiarioGramas: 300,
            limiteExcedido: consumo > 300,
            refeicoes: consumo ? [{ id: 'r1', dataHora: '2026-11-25T11:00:00Z', alimento: 'Ração', quantidadeGramas: consumo }] : [],
          })) as never);
  }

  it('CT-08-01: deve registrar a refeição e mostrar o consumo do dia', async () => {
    api_(0);
    const post = jest
      .spyOn(api, 'POST')
      .mockImplementation(() => resposta({ id: 'r2', consumoDoDia: 200, limiteExcedido: false }, 201) as never);
    await render(<Alimentacao />);
    expect(await screen.findByText('Hoje: 0 g de 250 g')).toBeOnTheScreen();
    expect(screen.getByLabelText('Alimento da refeição')).toHaveDisplayValue('Ração');
    await fireEvent.changeText(screen.getByLabelText('Quantidade (g)'), '200');
    await fireEvent.changeText(screen.getByLabelText('Hora (HH:MM)'), '0800');
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText('Refeição registrada')).toBeOnTheScreen();
    const corpo = (post.mock.calls[0]?.[1] as { body: Record<string, unknown> }).body;
    expect(corpo).toMatchObject({ alimento: 'Ração', quantidadeGramas: 200 });
    expect(String(corpo.dataHora)).toMatch(/T11:00:00\.000Z$/);
  });

  it('CT-08-02: deve avisar que o limite diário foi excedido', async () => {
    api_(250);
    jest
      .spyOn(api, 'POST')
      .mockImplementation(() => resposta({ id: 'r2', consumoDoDia: 350, limiteDiarioGramas: 300, limiteExcedido: true }, 201) as never);
    await render(<Alimentacao />);
    await fireEvent.changeText(await screen.findByLabelText('Quantidade (g)'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText('Limite diário excedido')).toBeOnTheScreen();
    expect(screen.getByText('O pet já comeu 350 g hoje; o limite é 300 g.')).toBeOnTheScreen();
  });

  it('deve criar o plano e recusar limite menor que a meta', async () => {
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/pets/{petId}/plano-alimentar' ? resposta({ plano: null }) : resposta({ consumoDoDia: 0, refeicoes: [] })) as never);
    const put = jest.spyOn(api, 'PUT').mockImplementation(() => resposta(plano) as never);
    await render(<Alimentacao />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Criar plano' }));
    await fireEvent.changeText(screen.getByLabelText('Alimento'), 'Ração');
    await fireEvent.changeText(screen.getByLabelText('Meta diária (g)'), '250');
    await fireEvent.changeText(screen.getByLabelText('Limite diário (g, opcional)'), '200');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar plano' }));
    expect(screen.getByText('O limite diário não pode ser menor que a meta.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Limite diário (g, opcional)'), '300');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar plano' }));
    expect(put).toHaveBeenCalledWith('/pets/{petId}/plano-alimentar', {
      params: { path: { petId: 'p1' } },
      body: { alimento: 'Ração', metaDiariaGramas: 250, refeicoesPorDia: 2, limiteDiarioGramas: 300 },
    });
  });
});
