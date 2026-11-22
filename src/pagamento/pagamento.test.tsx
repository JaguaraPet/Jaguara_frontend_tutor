import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import Pagar from '../app/pagar/[agendamentoId]';
import { TOKEN_RECUSADO, bandeira, numeroValido, problemaNoCartao, tokenizarCartao } from './cartao';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ agendamentoId: 'a1', servico: 'Banho', valor: '60' }),
}));

type Qualquer = Awaited<ReturnType<typeof api.POST>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const cartaoTeste = {
  numero: '5031 4332 1540 6351',
  validade: '11/30',
  cvv: '123',
  titular: 'APRO',
  cpf: '529.982.247-25',
  debito: false,
};

describe('UC-44 · Pagamento no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('deve validar o cartão e achar a bandeira', async () => {
    expect(numeroValido('4111 1111 1111 1111')).toBe(true);
    expect(numeroValido('4111 1111 1111 1112')).toBe(false);
    expect(bandeira('4111111111111111', false)).toBe('visa');
    expect(bandeira('5031433215406351', true)).toBe('debmaster');
    expect(bandeira('6362970000457013', false)).toBe('elo');
    expect(problemaNoCartao(cartaoTeste, new Date(2026, 10, 22))).toBeNull();
    expect(problemaNoCartao({ ...cartaoTeste, validade: '10/26' }, new Date(2026, 10, 22))).toMatch(/vencido/);
    expect(problemaNoCartao({ ...cartaoTeste, cpf: '123' }, new Date(2026, 10, 22))).toMatch(/CPF/);
    expect(await tokenizarCartao({ ...cartaoTeste, titular: 'othe' })).toBe(TOKEN_RECUSADO);
    expect(await tokenizarCartao(cartaoTeste)).toBe('cartao-teste-6351');
  });

  it('CT-44-01: deve gerar o PIX e mostrar a confirmação quando o banco paga', async () => {
    jest.useFakeTimers();
    const pendente = { id: 'pg1', status: 'PENDENTE', metodo: 'PIX', valor: 60, qrCode: '00020126-PIX-TESTE' };
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta(pendente, 201) as never);
    jest
      .spyOn(api, 'GET')
      .mockImplementationOnce(() => resposta([{ ...pendente, qrCode: undefined }]) as never)
      .mockImplementation(() => resposta([{ id: 'pg1', status: 'ACEITO', metodo: 'PIX', valor: 60 }]) as never);
    await render(<Pagar />);
    await fireEvent.press(screen.getByRole('button', { name: 'Gerar código PIX' }));
    expect(await screen.findByText('00020126-PIX-TESTE')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/pagamentos', { body: { agendamentoId: 'a1', metodo: 'PIX' } });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByText('Aguardando o banco')).toBeOnTheScreen();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
    });
    expect(await screen.findByText('Pagamento confirmado')).toBeOnTheScreen();
  });

  it('CT-44-02: deve mostrar a recusa do cartão e deixar tentar outro meio', async () => {
    const post = jest
      .spyOn(api, 'POST')
      .mockImplementation(() =>
        resposta({ id: 'pg2', status: 'RECUSADO', metodo: 'CARTAO_CREDITO', motivoRecusa: 'Saldo insuficiente no cartão.' }, 201) as never,
      );
    await render(<Pagar />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Cartão de crédito' }));
    await fireEvent.changeText(screen.getByLabelText('Número do cartão'), cartaoTeste.numero);
    await fireEvent.changeText(screen.getByLabelText('Validade (MM/AA)'), cartaoTeste.validade);
    await fireEvent.changeText(screen.getByLabelText('Código de segurança'), cartaoTeste.cvv);
    await fireEvent.changeText(screen.getByLabelText('Nome no cartão'), 'OTHE');
    await fireEvent.changeText(screen.getByLabelText('CPF do titular'), cartaoTeste.cpf);
    await fireEvent.press(screen.getByRole('button', { name: 'Pagar com cartão' }));
    expect(await screen.findByText('Saldo insuficiente no cartão.')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/pagamentos', {
      body: { agendamentoId: 'a1', metodo: 'CARTAO_CREDITO', tokenCartao: TOKEN_RECUSADO, bandeiraCartao: 'master' },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar outro meio' }));
    expect(screen.getByRole('button', { name: 'Pagar com cartão' })).toBeOnTheScreen();
  });

  it('deve gerar o boleto com o endereço e mostrar a linha digitável', async () => {
    const boleto = {
      id: 'pg3',
      status: 'PENDENTE',
      metodo: 'BOLETO',
      valor: 60,
      boleto: {
        url: 'https://boleto.exemplo/pg3',
        linhaDigitavel: '23790.00009 12345.678900 00000.000000 1 0000006000',
        vencimento: '2026-11-23T23:59:59.000-03:00',
      },
    };
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta(boleto, 201) as never);
    await render(<Pagar />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Boleto' }));
    await fireEvent.changeText(screen.getByLabelText('CEP'), '01310-100');
    await fireEvent.changeText(screen.getByLabelText('Rua'), 'Avenida Paulista');
    await fireEvent.changeText(screen.getByLabelText('Número'), '1000');
    await fireEvent.changeText(screen.getByLabelText('Bairro'), 'Bela Vista');
    await fireEvent.changeText(screen.getByLabelText('Cidade'), 'São Paulo');
    await fireEvent.changeText(screen.getByLabelText('UF'), 'sp');
    await fireEvent.press(screen.getByRole('button', { name: 'Gerar boleto' }));
    expect(await screen.findByText(boleto.boleto.linhaDigitavel)).toBeOnTheScreen();
    expect(screen.getByText(/Vence em 23\/11\/2026/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Abrir boleto' })).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/pagamentos', {
      body: {
        agendamentoId: 'a1',
        metodo: 'BOLETO',
        endereco: {
          cep: '01310100',
          logradouro: 'Avenida Paulista',
          numero: '1000',
          bairro: 'Bela Vista',
          cidade: 'São Paulo',
          uf: 'SP',
        },
      },
    });
  });

  it('deve pedir o boleto sem endereço quando os campos ficam em branco e barrar endereço incompleto', async () => {
    const post = jest
      .spyOn(api, 'POST')
      .mockImplementation(() =>
        resposta({ title: 'Dados inválidos', campos: [{ mensagem: 'Para pagar com boleto, informe o seu endereço.' }] }, 422) as never,
      );
    await render(<Pagar />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Boleto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Gerar boleto' }));
    expect(await screen.findByText('Para pagar com boleto, informe o seu endereço.')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/pagamentos', { body: { agendamentoId: 'a1', metodo: 'BOLETO' } });
    post.mockClear();
    await fireEvent.changeText(screen.getByLabelText('CEP'), '0131');
    await fireEvent.press(screen.getByRole('button', { name: 'Gerar boleto' }));
    expect(await screen.findByText('Informe o CEP com 8 números.')).toBeOnTheScreen();
    expect(post).not.toHaveBeenCalled();
  });

  it('deve barrar cartão inválido antes de chamar o gateway', async () => {
    const post = jest.spyOn(api, 'POST');
    await render(<Pagar />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Cartão de débito' }));
    await fireEvent.changeText(screen.getByLabelText('Número do cartão'), '4111 1111 1111 1112');
    await fireEvent.press(screen.getByRole('button', { name: 'Pagar com cartão' }));
    expect(await screen.findByText('Confira o número do cartão.')).toBeOnTheScreen();
    expect(post).not.toHaveBeenCalled();
  });
});
