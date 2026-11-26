import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import Notificacoes from '../app/notificacoes';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

describe('UC-31 · Notificações no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  function api_() {
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/notificacoes'
        ? resposta([
            { id: 'n1', titulo: 'Hora do remédio de Thor', mensagem: 'Vermífugo', status: 'AGENDADA', dataProgramada: '2026-11-25T22:30:00Z' },
            { id: 'n2', titulo: 'Vacina de Thor', mensagem: 'V10 amanhã', status: 'ENVIADA', dataEnvio: '2026-11-24T12:00:00Z' },
          ])
        : resposta([{ tipoEvento: 'MEDICAMENTO', canal: 'PUSH', antecedenciaMinutos: 0, ativa: true }])) as never);
  }

  it('deve mostrar os lembretes programados e os recebidos', async () => {
    api_();
    await render(<Notificacoes />);
    expect(await screen.findByText('Hora do remédio de Thor')).toBeOnTheScreen();
    expect(screen.getByText('Vacina de Thor')).toBeOnTheScreen();
  });

  it('CT-31-01: deve configurar 30 minutos de antecedência para medicamentos', async () => {
    api_();
    const put = jest.spyOn(api, 'PUT').mockImplementation(() => resposta({}) as never);
    await render(<Notificacoes />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Preferências' }));
    await fireEvent.press(screen.getByRole('radio', { name: '30 min antes' }));
    expect(put).toHaveBeenCalledWith('/notificacoes/configuracoes/{tipoEvento}', {
      params: { path: { tipoEvento: 'MEDICAMENTO' } },
      body: { canal: 'PUSH', antecedenciaMinutos: 30, ativa: true },
    });
    expect(await screen.findByText('Medicamento: preferência salva')).toBeOnTheScreen();
  });

  it('deve voltar a preferência quando a API recusa', async () => {
    api_();
    jest.spyOn(api, 'PUT').mockImplementation(() => resposta({ title: 'Não foi possível salvar' }, 503) as never);
    await render(<Notificacoes />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Preferências' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Por e-mail' }));
    expect(await screen.findByText('Preferência não salva')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'No celular' })).toBeChecked();
  });
});
