import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import Configuracoes from '../app/configuracoes';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('../notificacoes/push', () => ({ removerAparelho: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({ data, response: new Response(null, { status }) } as unknown as Qualquer);
const conta = (email: string) => ({ id: 't1', tipo: 'TUTOR', perfil: 'Tutor', nome: 'Ana', email });

describe('Configurações do tutor no app', () => {
  it('deve trocar a aparência quando o tutor escolhe o modo escuro', async () => {
    await render(<Configuracoes />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Escuro' }));
    expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked();
  });

  it('deve abrir as notificações e a privacidade a partir das configurações', async () => {
    await render(<Configuracoes />);
    await fireEvent.press(screen.getByRole('button', { name: 'Notificações' }));
    expect(router.push).toHaveBeenCalledWith('/notificacoes');
    await fireEvent.press(screen.getByRole('button', { name: 'Privacidade e dados' }));
    expect(router.push).toHaveBeenCalledWith('/privacidade');
  });

  it('deve enviar o link de troca de senha para o e-mail da conta', async () => {
    jest.spyOn(api, 'GET').mockImplementation((() => resposta(conta('ana@exemplo.com'))) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation((() => resposta(undefined, 204)) as never);
    await render(<Configuracoes />);
    await fireEvent.press(screen.getByRole('button', { name: 'Trocar senha' }));
    expect(await screen.findByText('Confira seu e-mail')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/auth/senha/recuperacao', { body: { email: 'ana@exemplo.com' } });
    jest.restoreAllMocks();
  });

  it('não deve enviar o link na demonstração', async () => {
    jest.spyOn(api, 'GET').mockImplementation((() => resposta(conta('tutor-ab12@demonstracao.invalid'))) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation((() => resposta(undefined, 204)) as never);
    await render(<Configuracoes />);
    await fireEvent.press(screen.getByRole('button', { name: 'Trocar senha' }));
    expect(await screen.findByText('Na demonstração a senha não muda')).toBeOnTheScreen();
    expect(post).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
