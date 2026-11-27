import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import Alergias from '../app/pets/[petId]/alergias';

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

const lista = [
  { id: 'a1', tipo: 'RESTRICAO_MEDICAMENTOSA', descricao: 'Dipirona', gravidade: 'GRAVE', destaque: true },
  { id: 'a2', tipo: 'RESTRICAO_ALIMENTAR', descricao: 'Frango', gravidade: 'LEVE', destaque: false, observacoes: 'Coceira leve' },
];

describe('UC-37 · Alergias e restrições no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve listar com a grave em destaque', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta(lista) as never);
    await render(<Alergias />);
    expect(await screen.findByText('Restrição a medicamento: Dipirona')).toBeOnTheScreen();
    expect(screen.getByText('Em destaque no perfil')).toBeOnTheScreen();
    expect(screen.getByText('Coceira leve')).toBeOnTheScreen();
  });

  it('CT-37-01: deve registrar alergia grave a dipirona', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta([]) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta(lista[0], 201) as never);
    await render(<Alergias />);
    await fireEvent.press(await screen.findByText('Registrar alergia ou restrição'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Restrição a medicamento' }));
    await fireEvent.changeText(screen.getByLabelText('A que o pet reage'), 'Dipirona');
    await fireEvent.press(screen.getByRole('radio', { name: 'Grave' }));
    await fireEvent.press(screen.getByText('Salvar'));
    expect(post).toHaveBeenCalledWith('/pets/{petId}/alergias', {
      params: { path: { petId: 'p1' } },
      body: { tipo: 'RESTRICAO_MEDICAMENTOSA', descricao: 'Dipirona', gravidade: 'GRAVE' },
    });
    expect(await screen.findByText('Ela aparece em destaque no perfil do pet.')).toBeOnTheScreen();
  });

  it('deve pedir a descrição e recusar data futura', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta([]) as never);
    const post = jest.spyOn(api, 'POST');
    await render(<Alergias />);
    await fireEvent.press(await screen.findByText('Registrar alergia ou restrição'));
    await fireEvent.changeText(screen.getByLabelText('Identificada em (opcional, DD/MM/AAAA)'), '01012999');
    await fireEvent.press(screen.getByText('Salvar'));
    expect(screen.getByText('A data não pode ser futura.')).toBeOnTheScreen();
    expect(screen.getByText(/Diga a que o pet tem alergia/)).toBeOnTheScreen();
    expect(post).not.toHaveBeenCalled();
  });

  it('deve alterar a gravidade de uma alergia', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta(lista) as never);
    const patch = jest.spyOn(api, 'PATCH').mockImplementation(() => resposta(lista[1]) as never);
    await render(<Alergias />);
    await fireEvent.press(await screen.findByLabelText('Alterar Frango'));
    await fireEvent.press(screen.getByRole('radio', { name: 'Moderada' }));
    await fireEvent.press(screen.getByText('Salvar'));
    expect(patch).toHaveBeenCalledWith('/alergias/{alergiaId}', {
      params: { path: { alergiaId: 'a2' } },
      body: { tipo: 'RESTRICAO_ALIMENTAR', descricao: 'Frango', gravidade: 'MODERADA', observacoes: 'Coceira leve' },
    });
    expect(await screen.findByText('Alergia alterada')).toBeOnTheScreen();
  });

  it('CT-37-02: deve mostrar a recusa da API ao excluir', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta(lista) as never);
    jest
      .spyOn(api, 'DELETE')
      .mockImplementation(() => resposta({ title: 'Acesso negado', detail: 'Sem permissão para editar dados clínicos.' }, 403) as never);
    await render(<Alergias />);
    await fireEvent.press(await screen.findByLabelText('Excluir Dipirona'));
    await fireEvent.press(screen.getByText('Confirmar exclusão'));
    expect(await screen.findByText('Alergia não excluída')).toBeOnTheScreen();
  });
});
