import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { getDocumentAsync } from 'expo-document-picker';
import { api } from '../api/cliente';
import Documentos from '../app/pets/[petId]/documentos';
import { enviarDocumento } from './envio';

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

const arquivo = { uri: 'file:///cache/laudo.pdf', name: 'laudo.pdf', size: 2048, mimeType: 'application/pdf' };

/** Simula o arquivo local e o armazenamento S3. */
function armazenamento(statusPut = 200) {
  const pedidos: { url: string; metodo: string }[] = [];
  const http = jest.fn((url: string, opcoes?: RequestInit) => {
    pedidos.push({ url, metodo: opcoes?.method ?? 'GET' });
    return Promise.resolve(opcoes?.method === 'PUT' ? new Response(null, { status: statusPut }) : new Response('%PDF'));
  });
  return { http: http as unknown as typeof fetch, pedidos };
}

describe('UC-34 · Documentos no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve enviar o arquivo direto para a URL assinada', async () => {
    const post = jest
      .spyOn(api, 'POST')
      .mockImplementation(() => resposta({ documentoId: 'd1', urlEnvio: 'https://s3/envio?assinado', expiraEm: '' }, 201) as never);
    const { http, pedidos } = armazenamento();
    await expect(enviarDocumento('p1', { titulo: ' Hemograma ', tipo: 'LAUDO', arquivo }, http)).resolves.toBeNull();
    expect(post).toHaveBeenCalledWith('/pets/{petId}/documentos', {
      params: { path: { petId: 'p1' } },
      body: { titulo: 'Hemograma', tipo: 'LAUDO', nomeArquivo: 'laudo.pdf', tamanhoBytes: 2048 },
    });
    expect(pedidos).toEqual([
      { url: 'file:///cache/laudo.pdf', metodo: 'GET' },
      { url: 'https://s3/envio?assinado', metodo: 'PUT' },
    ]);
  });

  it('deve desfazer o registro quando o envio do arquivo falha e barrar arquivo grande', async () => {
    jest
      .spyOn(api, 'POST')
      .mockImplementation(() => resposta({ documentoId: 'd1', urlEnvio: 'https://s3/envio', expiraEm: '' }, 201) as never);
    const del = jest.spyOn(api, 'DELETE').mockImplementation(() => resposta(null, 204) as never);
    const { http } = armazenamento(403);
    await expect(enviarDocumento('p1', { titulo: 'X', tipo: 'OUTRO', arquivo }, http)).resolves.toMatch(/Não foi possível enviar/);
    expect(del).toHaveBeenCalledWith('/documentos/{documentoId}', { params: { path: { documentoId: 'd1' } } });
    await expect(
      enviarDocumento('p1', { titulo: 'X', tipo: 'OUTRO', arquivo: { ...arquivo, size: 11 * 1024 * 1024 } }, http),
    ).resolves.toBe('O arquivo passa de 10 MB.');
  });

  it('CT-34-01: deve escolher o arquivo, enviar e listar o documento', async () => {
    let lista: unknown[] = [];
    jest.spyOn(api, 'GET').mockImplementation(() => resposta(lista) as never);
    jest.mocked(getDocumentAsync).mockResolvedValue({ canceled: false, assets: [arquivo] } as never);
    jest.spyOn(api, 'POST').mockImplementation(() => {
      lista = [{ id: 'd1', titulo: 'laudo', tipo: 'LAUDO', nomeArquivo: 'laudo.pdf', dataUpload: '2026-11-24T12:00:00Z' }];
      return resposta({ documentoId: 'd1', urlEnvio: 'https://s3/envio', expiraEm: '' }, 201) as never;
    });
    const original = globalThis.fetch;
    globalThis.fetch = armazenamento().http;
    try {
      await render(<Documentos />);
      await fireEvent.press(await screen.findByRole('button', { name: 'Escolher arquivo' }));
      expect(await screen.findByRole('button', { name: 'Arquivo: laudo.pdf' })).toBeOnTheScreen();
      expect(screen.getByLabelText('Título')).toHaveDisplayValue('laudo');
      await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
      expect(await screen.findByText('Documento enviado')).toBeOnTheScreen();
      expect(await screen.findByRole('button', { name: 'Abrir laudo' })).toBeOnTheScreen();
    } finally {
      globalThis.fetch = original;
    }
  });
});
