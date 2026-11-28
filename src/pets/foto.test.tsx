import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { api } from '../api/cliente';
import { enviarFotoPet, iconeEspecie } from './FotoPet';

type Qualquer = Awaited<ReturnType<typeof api.POST>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

describe('Foto do pet', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve escolher o emoji pela espécie', () => {
    expect(iconeEspecie('Gato')).toBe('🐱');
    expect(iconeEspecie('Cachorro')).toBe('🐶');
    expect(iconeEspecie('Silvestre')).toBe('🐆');
    expect(iconeEspecie('Boi e vaca')).toBe('🐄');
    expect(iconeEspecie('Outro')).toBe('🐾');
  });

  it('deve pedir a URL e enviar a foto direto ao armazenamento', async () => {
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta({ urlEnvio: 'https://s3/envio' }, 201) as never);
    const http = jest.fn(async (url: string | URL | Request) =>
      String(url).startsWith('file:') ? new Response('img') : new Response(null, { status: 200 }),
    ) as unknown as typeof fetch;
    const erro = await enviarFotoPet('p1', { uri: 'file:///thor.jpg', name: 'thor.jpg', size: 10, mimeType: 'image/jpeg' }, http);
    expect(erro).toBeNull();
    expect(post).toHaveBeenCalledWith('/pets/{petId}/foto', {
      params: { path: { petId: 'p1' } },
      body: { nomeArquivo: 'thor.jpg', tamanhoBytes: 10 },
    });
  });

  it('deve recusar foto acima de 8 MB sem chamar a API', async () => {
    const post = jest.spyOn(api, 'POST');
    expect(await enviarFotoPet('p1', { uri: 'file:///x.jpg', name: 'x.jpg', size: 9 * 1024 * 1024 })).toBe('A foto passa de 8 MB.');
    expect(post).not.toHaveBeenCalled();
  });
});
