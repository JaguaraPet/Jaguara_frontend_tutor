import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';
import { api } from '../api/cliente';
import PetPerdido from '../app/pets/[petId]/perdido';

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ petId: 'p1' }) }));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

describe('Pet perdido no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve criar o aviso, compartilhar a página e marcar como encontrado', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta({ perdido: false }) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(
      () =>
        resposta(
          { perdido: true, local: 'Praça da Sé', telefone: '11988880000', url: 'https://jaguarapet.com.br/perdido/abc' },
          201,
        ) as never,
    );
    const apagar = jest.spyOn(api, 'DELETE').mockImplementation(() => resposta(null, 204) as never);
    const compartilhar = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    await render(<PetPerdido />);
    await fireEvent.changeText(await screen.findByLabelText('Onde foi visto pela última vez'), 'Praça da Sé');
    await fireEvent.changeText(screen.getByLabelText('Telefone para contato'), '11988880000');
    await fireEvent.press(screen.getByText('Criar o aviso'));
    expect(await screen.findByText('Visto pela última vez: Praça da Sé')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('/pets/{petId}/perdido', {
      params: { path: { petId: 'p1' } },
      body: { local: 'Praça da Sé', telefone: '11988880000' },
    });
    await fireEvent.press(screen.getByText('Compartilhar no WhatsApp e redes'));
    expect(compartilhar).toHaveBeenCalledWith({ message: expect.stringContaining('https://jaguarapet.com.br/perdido/abc') });
    await fireEvent.press(screen.getByText('Encontrei! 🎉'));
    expect(apagar).toHaveBeenCalled();
    expect(await screen.findByText('Criar o aviso')).toBeTruthy();
  });
});
