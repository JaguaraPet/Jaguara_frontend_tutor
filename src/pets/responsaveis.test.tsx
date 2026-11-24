import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import Responsaveis from '../app/pets/[petId]/responsaveis';

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

const ana = { tutorId: 't1', nome: 'Ana', tipo: 'PRINCIPAL', voce: true };
const bia = { tutorId: 't2', nome: 'Bia', tipo: 'ADICIONAL', voce: false };

describe('UC-05 · Responsáveis pelo pet no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('CT-05-01: o principal adiciona outro tutor como adicional', async () => {
    let lista = [ana];
    jest.spyOn(api, 'GET').mockImplementation(() => resposta(lista) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => {
      lista = [ana, bia];
      return resposta(lista, 201) as never;
    });
    await render(<Responsaveis />);
    expect(await screen.findByText('Ana (você)')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('E-mail do tutor'), 'bia@exemplo.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('Responsável adicionado')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/pets/{petId}/responsaveis', {
      params: { path: { petId: 'p1' } },
      body: { email: 'bia@exemplo.com', tipo: 'ADICIONAL' },
    });
    expect(await screen.findByText('Bia')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tornar principal: Bia' })).toBeOnTheScreen();
  });

  it('CT-05-02: mostra a recusa quando o único principal tenta sair', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta([ana, bia]) as never);
    jest
      .spyOn(api, 'DELETE')
      .mockImplementation(() => resposta({ title: 'O pet precisa de um responsável principal.' }, 409) as never);
    await render(<Responsaveis />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Deixar de ser responsável' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('O pet precisa de um responsável principal.')).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('o adicional só vê a opção de sair', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta([{ ...ana, voce: false }, { ...bia, voce: true }]) as never);
    const del = jest.spyOn(api, 'DELETE').mockImplementation(() => resposta(null, 204) as never);
    await render(<Responsaveis />);
    expect(await screen.findByText('Bia (você)')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Adicionar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remover Ana' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Deixar de ser responsável' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
    expect(del).toHaveBeenCalledWith('/pets/{petId}/responsaveis/{tutorId}', {
      params: { path: { petId: 'p1', tutorId: 't2' } },
    });
    expect(router.replace).toHaveBeenCalledWith('/pets');
  });
});
