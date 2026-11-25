import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import Pagamentos from '../app/pagamentos';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const pago = {
  id: 'pg1',
  codigoTransacao: '123',
  valor: 60,
  dataHora: '2026-11-20T15:00:00Z',
  metodo: 'PIX',
  status: 'ACEITO',
  descricao: 'Banho',
  contraparte: 'Patas',
  pet: 'Thor',
  podeReembolsar: true,
};

describe('UC-45 · Pagamentos no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('CT-45-01: deve listar e filtrar os pagamentos', async () => {
    const get = jest.spyOn(api, 'GET').mockImplementation(((_c: string, o: { params: { query: { status?: string } } }) =>
      resposta(o.params.query.status === 'RECUSADO' ? [] : [pago])) as never);
    await render(<Pagamentos />);
    expect(await screen.findByText('Banho · Thor')).toBeOnTheScreen();
    expect(screen.getByText('R$ 60,00')).toBeOnTheScreen();
    expect(screen.getByText('Pago')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Recusados' }));
    expect(await screen.findByText('Nenhum pagamento encontrado para o filtro selecionado.')).toBeOnTheScreen();
    expect(get).toHaveBeenLastCalledWith('/pagamentos', { params: { query: { status: 'RECUSADO' } } });
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar filtro' }));
    expect(await screen.findByText('Banho · Thor')).toBeOnTheScreen();
  });

  it('deve pedir o reembolso com motivo', async () => {
    let lista = [pago];
    jest.spyOn(api, 'GET').mockImplementation(() => resposta(lista) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => {
      lista = [{ ...pago, podeReembolsar: false, reembolso: { status: 'EM_ANALISE', motivo: 'x', dataSolicitacao: '' } } as typeof pago];
      return resposta(lista[0], 201) as never;
    });
    await render(<Pagamentos />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Pedir reembolso de Banho' }));
    await fireEvent.changeText(screen.getByLabelText('Motivo do reembolso'), 'curto');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(screen.getByText('Conte o motivo em pelo menos 10 caracteres.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Motivo do reembolso'), 'O banho foi cancelado');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(await screen.findByText('Reembolso solicitado')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/pagamentos/{pagamentoId}/reembolsos', {
      params: { path: { pagamentoId: 'pg1' } },
      body: { motivo: 'O banho foi cancelado' },
    });
    expect(await screen.findByText('Reembolso em análise')).toBeOnTheScreen();
  });

  it('CT-45-02: deve mostrar a recusa do reembolso', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta([pago]) as never);
    jest
      .spyOn(api, 'POST')
      .mockImplementation(() => resposta({ title: 'Só dá para pedir reembolso de pagamento confirmado.' }, 409) as never);
    await render(<Pagamentos />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Pedir reembolso de Banho' }));
    await fireEvent.changeText(screen.getByLabelText('Motivo do reembolso'), 'Quero o dinheiro de volta');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(await screen.findByText('Só dá para pedir reembolso de pagamento confirmado.')).toBeOnTheScreen();
  });
});
