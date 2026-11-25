import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { api } from '../api/cliente';
import Exames from '../app/pets/[petId]/exames';

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

const laudo = { id: 'd1', titulo: 'Laudo do hemograma', tipo: 'LAUDO', nomeArquivo: 'laudo.pdf', dataUpload: '2026-11-20T12:00:00Z' };

describe('UC-36 · Exames no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('CT-36-01: deve registrar o hemograma com o laudo e abrir o arquivo', async () => {
    let exames: unknown[] = [];
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) => {
      if (caminho === '/pets/{petId}/documentos') return resposta([laudo]);
      if (caminho === '/documentos/{documentoId}/download') return resposta({ url: 'https://s3/laudo.pdf?assinado' });
      return resposta(exames);
    }) as never);
    const abrir = jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
    const post = jest.spyOn(api, 'POST').mockImplementation(() => {
      exames = [{ id: 'e1', tipoExame: 'Hemograma', dataRealizacao: '2026-11-10', temArquivo: true, documentoId: 'd1' }];
      return resposta(exames[0], 201) as never;
    });
    await render(<Exames />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Registrar exame' }));
    await fireEvent.changeText(screen.getByLabelText('Exame'), 'Hemograma');
    await fireEvent.changeText(screen.getByLabelText('Data (DD/MM/AAAA)'), '10112026');
    await fireEvent.press(screen.getByRole('radio', { name: 'Laudo do hemograma' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar exame' }));
    expect(await screen.findByText('Exame registrado')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/pets/{petId}/exames', {
      params: { path: { petId: 'p1' } },
      body: { tipoExame: 'Hemograma', dataRealizacao: '2026-11-10', documentoId: 'd1' },
    });
    await fireEvent.press(await screen.findByRole('button', { name: 'Ver laudo de Hemograma' }));
    expect(abrir).toHaveBeenCalledWith('https://s3/laudo.pdf?assinado');
  });

  it('CT-36-02: deve mostrar a recusa quando não pode registrar', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta([]) as never);
    jest.spyOn(api, 'POST').mockImplementation(() => resposta({ title: 'Acesso negado' }, 403) as never);
    await render(<Exames />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Registrar exame' }));
    await fireEvent.changeText(screen.getByLabelText('Exame'), 'Raio X');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar exame' }));
    expect(await screen.findByText('Exame não registrado')).toBeOnTheScreen();
  });
});
