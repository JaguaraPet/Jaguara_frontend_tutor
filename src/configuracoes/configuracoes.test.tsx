import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import Configuracoes from '../app/configuracoes';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));
jest.mock('../notificacoes/push', () => ({ removerAparelho: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

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
});
