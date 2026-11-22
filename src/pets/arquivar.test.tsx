import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import { ArquivarPet, DesarquivarPet } from './ArquivarPet';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

type Qualquer = Awaited<ReturnType<typeof api.POST>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

describe('UC-04 · Arquivar e excluir pet no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve arquivar depois de confirmar e voltar para a lista', async () => {
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta(undefined, 204) as never);
    await render(<ArquivarPet petId="p1" nome="Thor" />);
    await fireEvent.press(screen.getByText('Arquivar pet'));
    expect(post).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Arquivar Thor'));
    expect(post).toHaveBeenCalledWith('/pets/{petId}/arquivamento', { params: { path: { petId: 'p1' } } });
    expect(router.replace).toHaveBeenCalledWith('/pets');
  });

  it('CT-04-02: deve impedir a exclusão do pet com histórico e oferecer o arquivamento', async () => {
    jest
      .spyOn(api, 'DELETE')
      .mockImplementation(() => resposta({ title: 'Pet com histórico', codigo: 'RN08_PET_COM_HISTORICO' }, 409) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta(undefined, 204) as never);
    await render(<ArquivarPet petId="p1" nome="Thor" />);
    await fireEvent.press(screen.getByText('Excluir pet'));
    await fireEvent.press(screen.getByText('Excluir Thor'));
    expect(await screen.findByText('Thor tem histórico e não pode ser excluído')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Arquivar Thor'));
    expect(post).toHaveBeenCalled();
  });

  it('deve excluir o pet sem histórico', async () => {
    const del = jest.spyOn(api, 'DELETE').mockImplementation(() => resposta(undefined, 204) as never);
    await render(<ArquivarPet petId="p2" nome="Kiwi" />);
    await fireEvent.press(screen.getByText('Excluir pet'));
    await fireEvent.press(screen.getByText('Excluir Kiwi'));
    expect(del).toHaveBeenCalledWith('/pets/{petId}', { params: { path: { petId: 'p2' } } });
    expect(router.replace).toHaveBeenCalledWith('/pets');
  });

  it('deve desarquivar o pet e avisar a tela', async () => {
    const del = jest.spyOn(api, 'DELETE').mockImplementation(() => resposta(undefined, 204) as never);
    const aoDesarquivar = jest.fn();
    await render(<DesarquivarPet petId="p1" nome="Thor" aoDesarquivar={aoDesarquivar} />);
    await fireEvent.press(screen.getByText('Desarquivar Thor'));
    expect(del).toHaveBeenCalledWith('/pets/{petId}/arquivamento', { params: { path: { petId: 'p1' } } });
    expect(aoDesarquivar).toHaveBeenCalled();
  });

  it('deve mostrar a recusa da API ao desarquivar', async () => {
    jest
      .spyOn(api, 'DELETE')
      .mockImplementation(() => resposta({ title: 'Só o responsável principal arquiva, desarquiva ou exclui o pet.' }, 403) as never);
    const aoDesarquivar = jest.fn();
    await render(<DesarquivarPet petId="p1" nome="Thor" aoDesarquivar={aoDesarquivar} />);
    await fireEvent.press(screen.getByText('Desarquivar Thor'));
    expect(await screen.findByText('Pet não desarquivado')).toBeOnTheScreen();
    expect(aoDesarquivar).not.toHaveBeenCalled();
  });
});
