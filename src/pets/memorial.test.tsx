import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import MemorialDoPet from '../app/pets/[petId]/memorial';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ petId: 'p1' }),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

describe('UC-15 · Memorial do pet no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('CT-15-02: pet ativo só oferece registrar o falecimento, com confirmação', async () => {
    let status = 'ATIVO';
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/pets/{petId}'
        ? resposta({ id: 'p1', nome: 'Thor', status })
        : resposta({ petId: 'p1', nome: 'Thor', publico: false, itens: [] })) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => {
      status = 'FALECIDO';
      return resposta(null, 204) as never;
    });
    await render(<MemorialDoPet />);
    expect(await screen.findByText('O memorial abre depois do falecimento registrado')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar falecimento' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar' }));
    expect(post).toHaveBeenCalledWith('/pets/{petId}/falecimento', { params: { path: { petId: 'p1' } } });
    expect(await screen.findByText('Em memória de Thor')).toBeOnTheScreen();
  });

  it('CT-15-01: deve salvar a mensagem, adicionar lembrança e mostrar a foto', async () => {
    let itens: unknown[] = [
      { id: 'i1', tipo: 'FOTO', urlFoto: 'https://s3/foto.jpg', dataRegistro: '2026-11-25T12:00:00Z' },
    ];
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/pets/{petId}'
        ? resposta({ id: 'p1', nome: 'Thor', status: 'FALECIDO' })
        : resposta({ petId: 'p1', nome: 'Thor', mensagem: 'Saudade', publico: false, itens })) as never);
    const put = jest.spyOn(api, 'PUT').mockImplementation(() => resposta({}) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => {
      itens = [...itens, { id: 'i2', tipo: 'HOMENAGEM', conteudo: 'Melhor amigo', dataRegistro: '2026-11-25T13:00:00Z' }];
      return resposta({ itemId: 'i2' }, 201) as never;
    });
    await render(<MemorialDoPet />);
    expect(await screen.findByLabelText('Foto de Thor')).toBeOnTheScreen();
    expect(screen.getByLabelText('Mensagem do memorial')).toHaveDisplayValue('Saudade');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar mensagem' }));
    expect(put).toHaveBeenCalledWith('/pets/{petId}/memorial', {
      params: { path: { petId: 'p1' } },
      body: { mensagem: 'Saudade', publico: false },
    });
    await fireEvent.press(screen.getByRole('radio', { name: 'Homenagem' }));
    await fireEvent.changeText(screen.getByLabelText('Texto'), 'Melhor amigo');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar texto' }));
    expect(post).toHaveBeenCalledWith('/pets/{petId}/memorial/itens', {
      params: { path: { petId: 'p1' } },
      body: { tipo: 'HOMENAGEM', conteudo: 'Melhor amigo' },
    });
    expect(await screen.findByText('Melhor amigo')).toBeOnTheScreen();
  });
});
