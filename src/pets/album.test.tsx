import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';
import { api } from '../api/cliente';
import { enviarAoAlbum } from '../app/pets/[petId]/album';
import { Comemoracoes, textoDaComemoracao } from './Comemoracoes';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => ({ petId: 'p1' }),
}));

type Qualquer = Awaited<ReturnType<typeof api.POST>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

describe('Álbum e comemorações no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve montar os textos do aniversário e do tempo no Jaguara', () => {
    expect(textoDaComemoracao({ petId: 'p1', petNome: 'Thor', tipo: 'ANIVERSARIO', anos: 5 }).titulo).toBe(
      'Hoje é aniversário de Thor!',
    );
    expect(
      textoDaComemoracao({ petId: 'p1', petNome: 'Mel', tipo: 'ANIVERSARIO_JAGUARA', anos: 1 }).detalhe,
    ).toBe('Há 1 ano vocês cuidam de Mel por aqui.');
  });

  it('deve compartilhar o aniversário', async () => {
    const compartilhar = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    await render(<Comemoracoes celebracoes={[{ petId: 'p1', petNome: 'Thor', tipo: 'ANIVERSARIO', anos: 5 }]} />);
    await fireEvent.press(screen.getByText('Compartilhar'));
    expect(compartilhar).toHaveBeenCalledWith({ message: expect.stringContaining('Hoje Thor faz 5 anos') });
  });

  it('deve enviar a foto ao álbum com a legenda', async () => {
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta({ id: 'f1', urlEnvio: 'https://s3/envio' }, 201) as never);
    const http = jest.fn(async (url: string | URL | Request) =>
      String(url).startsWith('file:') ? new Response('img') : new Response(null, { status: 200 }),
    ) as unknown as typeof fetch;
    expect(await enviarAoAlbum('p1', { uri: 'file:///praia.jpg', name: 'praia.jpg', size: 100 }, ' Na praia ', http)).toBeNull();
    expect(post).toHaveBeenCalledWith('/pets/{petId}/album', {
      params: { path: { petId: 'p1' } },
      body: { nomeArquivo: 'praia.jpg', tamanhoBytes: 100, legenda: 'Na praia' },
    });
  });
});
