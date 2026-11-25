import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import LinhaDoTempo from '../app/pets/[petId]/linha-do-tempo';

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

describe('UC-35 · Linha do tempo no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('CT-35-01: deve mostrar os registros do mais recente ao mais antigo e filtrar', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() =>
      resposta([
        { tipo: 'EXAME', titulo: 'Exame: Hemograma', data: '2026-01-10T12:00:00Z', referenciaId: 'e1' },
        { tipo: 'VACINACAO', titulo: 'Vacina V10', data: '2026-03-01T12:00:00Z', referenciaId: 'v1' },
        { tipo: 'ATENDIMENTO', titulo: 'Banho em Patas', data: '2026-05-05T15:00:00Z', referenciaId: 'a1' },
      ]) as never,
    );
    await render(<LinhaDoTempo />);
    expect(await screen.findByText('Banho em Patas')).toBeOnTheScreen();
    const titulos = screen.getAllByText(/Hemograma|V10|Banho/).map((t) => t.props.children as string);
    expect(titulos).toEqual(['Banho em Patas', 'Vacina V10', 'Exame: Hemograma']);
    await fireEvent.press(screen.getByRole('radio', { name: 'Vacina' }));
    expect(screen.queryByText('Banho em Patas')).toBeNull();
    expect(screen.getByText('Vacina V10')).toBeOnTheScreen();
  });

  it('CT-35-02: deve avisar quando a linha do tempo não pode ser aberta', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta({ title: 'Acesso negado' }, 403) as never);
    await render(<LinhaDoTempo />);
    expect(await screen.findByText('Linha do tempo indisponível')).toBeOnTheScreen();
  });
});
