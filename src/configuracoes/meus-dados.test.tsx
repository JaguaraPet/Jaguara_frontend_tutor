import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import MeusDados from '../app/meus-dados';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown) => Promise.resolve({ data, response: new Response(null, { status: 200 }) } as unknown as Qualquer);
const conta = { id: 't1', tipo: 'TUTOR', perfil: 'Tutor', nome: 'Ana', email: 'ana@exemplo.com', telefone: '11988884400' };

describe('Meus dados do tutor no app', () => {
  it('deve mostrar a conta e salvar o nome novo', async () => {
    jest.spyOn(api, 'GET').mockImplementation((() => resposta(conta)) as never);
    const patch = jest.spyOn(api, 'PATCH').mockImplementation((() => resposta({ ...conta, nome: 'Ana Ribeiro' })) as never);
    await render(<MeusDados />);
    expect(await screen.findByDisplayValue('ana@exemplo.com')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Ana Ribeiro');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar meus dados' }));
    expect(patch).toHaveBeenCalledWith('/conta', { body: { nome: 'Ana Ribeiro', telefone: '11988884400' } });
    expect(await screen.findByText('Dados salvos')).toBeOnTheScreen();
  });
});
