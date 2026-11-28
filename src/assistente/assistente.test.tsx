import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import Assistente, { SUGESTOES, textoSimples } from '../app/assistente';
import Pantera from '../app/pantera';
import { sessao } from '../sessao/sessao';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

describe('PANTERA e assistente virtual no app (UC-43)', () => {
  beforeEach(() => {
    jest.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 't1',
      tipo: 'TUTOR',
      perfil: 'Tutor',
      permissoes: [],
    });
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('CT-43-02: deve oferecer o PANTERA a quem não assina', async () => {
    jest
      .spyOn(api, 'POST')
      .mockImplementation(() => resposta({ codigo: 'RN25_ASSINATURA_PANTERA' }, 402) as never);
    jest.spyOn(api, 'GET').mockImplementation(() => resposta({ itens: [], total: 0 }));
    await render(<Assistente />);
    expect(await screen.findByText('Recurso do plano PANTERA')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tornar-se membro' }));
    expect(router.push).toHaveBeenCalledWith('/pantera');
  });

  it('deve enviar a pergunta e mostrar a resposta do assistente quando ela chega', async () => {
    jest.useFakeTimers();
    const aviso = { id: 'm0', conteudo: 'Olá! Sou o assistente.', remetenteId: null, dataHoraEnvio: '2026-11-21T12:00:00Z' };
    const pergunta = { id: 'm1', conteudo: 'Quantos passeios?', remetenteId: 't1', dataHoraEnvio: '2026-11-21T12:01:00Z' };
    const resposta2 = { id: 'm2', conteudo: 'Passeios diários ajudam.', remetenteId: null, dataHoraEnvio: '2026-11-21T12:01:05Z' };
    jest.spyOn(api, 'POST').mockImplementation(((caminho: string) =>
      caminho === '/conversas' ? resposta({ id: 'c1' }, 201) : resposta(pergunta, 201)) as never);
    const historicos = [[aviso], [pergunta, aviso]];
    const get = jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/pets'
        ? resposta({ itens: [], total: 0 })
        : resposta(historicos.shift() ?? [resposta2, pergunta, aviso])) as never);
    await render(<Assistente />);
    expect(await screen.findByText('Olá! Sou o assistente.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Sua pergunta'), 'Quantos passeios?');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('O assistente está respondendo…')).toBeOnTheScreen();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3500);
    });
    expect(await screen.findByText('Passeios diários ajudam.')).toBeOnTheScreen();
    expect(get).toHaveBeenCalledTimes(4);
  });

  it('deve assinar, escolher o PIX e mostrar o código copia e cola', async () => {
    jest
      .spyOn(api, 'GET')
      .mockImplementation(() => resposta({ plano: 'GRATUITO', vigente: false, precoMensal: 14.9 }));
    const post = jest.spyOn(api, 'POST').mockImplementation(((caminho: string) =>
      caminho === '/assinaturas'
        ? resposta({ id: 'as1', status: 'PENDENTE' }, 201)
        : resposta({ id: 'p1', status: 'PENDENTE', qrCode: '00020126-PIX-TESTE' }, 201)) as never);
    await render(<Pantera />);
    expect(await screen.findByText('R$ 14,90 por mês')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tornar-se membro' }));
    expect(await screen.findByRole('radio', { name: 'Boleto' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Gerar código PIX' }));
    expect(await screen.findByText('00020126-PIX-TESTE')).toBeOnTheScreen();
    expect(post).toHaveBeenLastCalledWith('/pagamentos', {
      body: { assinaturaId: 'as1', metodo: 'PIX' },
    });
  });

  it('deve sugerir três perguntas curtas e enviar a escolhida com um toque', async () => {
    const aviso = { id: 'm0', conteudo: 'Olá! Sou o assistente.', remetenteId: null, dataHoraEnvio: '2026-11-21T12:00:00Z' };
    const post = jest.spyOn(api, 'POST').mockImplementation(((caminho: string) =>
      caminho === '/conversas'
        ? resposta({ id: 'c1' }, 201)
        : resposta({ id: 'm1', conteudo: SUGESTOES[1], remetenteId: 't1', dataHoraEnvio: '2026-11-21T12:01:00Z' }, 201)) as never);
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/pets' ? resposta({ itens: [], total: 0 }) : resposta([aviso])) as never);
    await render(<Assistente />);
    expect(await screen.findByText('Olá! Sou o assistente.')).toBeOnTheScreen();
    for (const s of SUGESTOES) expect(screen.getByRole('button', { name: s })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: SUGESTOES[1] }));
    expect(post).toHaveBeenCalledWith('/conversas/{conversaId}/mensagens', {
      params: { path: { conversaId: 'c1' } },
      body: { conteudo: SUGESTOES[1] },
    });
    expect(screen.queryByRole('button', { name: SUGESTOES[0] })).toBeNull();
  });

  it('deve abrir a conversa do pet escolhido e trocar ao escolher outro', async () => {
    const pets = [
      { id: 'p1', nome: 'Bento', status: 'ATIVO' },
      { id: 'p2', nome: 'Luna', status: 'ATIVO' },
    ];
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta({ id: 'c1' }, 201) as never);
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/pets'
        ? resposta({ itens: pets, total: 2 })
        : resposta([{ id: 'm0', conteudo: '**Olá!** Sou o assistente.', remetenteId: null, dataHoraEnvio: '2026-11-21T12:00:00Z' }])) as never);
    await render(<Assistente />);
    expect(await screen.findByText('Olá! Sou o assistente.')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/conversas', { body: { tipo: 'ASSISTENTE_VIRTUAL', petId: 'p1' } });
    await fireEvent.press(screen.getByRole('radio', { name: 'Luna' }));
    expect(await screen.findByText('Olá! Sou o assistente.')).toBeOnTheScreen();
    expect(post).toHaveBeenLastCalledWith('/conversas', { body: { tipo: 'ASSISTENTE_VIRTUAL', petId: 'p2' } });
  });

  it('deve tirar a marcação de Markdown da resposta', () => {
    expect(textoSimples('**Cães:**\n* maçã\n## Evite')).toBe('Cães:\n- maçã\nEvite');
  });
});
