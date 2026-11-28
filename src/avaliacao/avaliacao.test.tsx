import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import { AvaliarAtendimentos } from './AvaliarAtendimentos';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const pendente = {
  agendamentoId: 'g1',
  realizadoEm: '2026-11-21T15:00:00Z',
  empresaId: 'e1',
  empresa: 'Patas',
  servicoId: 'sv1',
  servico: 'Banho',
  petId: 'p1',
  pet: 'Thor',
  procedimentos: 'Banho e secagem',
};

describe('Avaliação depois do atendimento no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve mostrar o que foi feito, enviar a nota e oferecer agendar de novo', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta([pendente]) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta({ id: 'a1' }, 201) as never);
    await render(<AvaliarAtendimentos versao={0} />);
    expect(await screen.findByText('Como foi o banho de Thor?')).toBeTruthy();
    expect(screen.getByText('O que foi feito: Banho e secagem')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('5 de 5, Excelente'));
    await fireEvent.changeText(screen.getByLabelText('Quer contar mais? (opcional)'), 'Voltou ótimo');
    await fireEvent.press(screen.getByText('Enviar avaliação'));
    expect(await screen.findByText('Obrigado pela avaliação!')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/agendamentos/{agendamentoId}/avaliacao', {
      params: { path: { agendamentoId: 'g1' } },
      body: { nota: 5, comentario: 'Voltou ótimo' },
    });
    await fireEvent.press(screen.getByText('Agendar de novo'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/solicitar/[servicoId]',
      params: { servicoId: 'sv1', petId: 'p1' },
    });
  });
});
