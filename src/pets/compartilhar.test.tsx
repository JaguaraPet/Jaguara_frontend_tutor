import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import Compartilhar from '../app/pets/[petId]/compartilhar';
import { dataExpiracao, problemaNoCompartilhamento } from './compartilhar';

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

describe('UC-11 · Compartilhar perfil no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve validar e calcular a validade', () => {
    expect(problemaNoCompartilhamento({ modo: 'EMAIL', email: 'a@b.com', empresaId: '', escopos: [] })).toMatch(/Escolha/);
    expect(problemaNoCompartilhamento({ modo: 'EMAIL', email: 'a@b.com', empresaId: '', escopos: ['EDICAO_CLINICA'] })).toMatch(
      /só para empresas/,
    );
    expect(problemaNoCompartilhamento({ modo: 'EMPRESA', email: '', empresaId: '', escopos: ['VACINAS'] })).toMatch(/empresa/);
    expect(dataExpiracao('0')).toBeUndefined();
    expect(dataExpiracao('7', new Date('2026-11-25T12:00:00Z'))).toBe('2026-12-02T12:00:00.000Z');
  });

  it('CT-11-01: deve compartilhar só vacinas e alergias por e-mail e revogar', async () => {
    let lista: unknown[] = [{ id: 'c0', destinatarioEmail: 'vet@exemplo.com', escopos: ['VACINAS'], status: 'ATIVO' }];
    jest.spyOn(api, 'GET').mockImplementation(() => resposta(lista) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(((caminho: string) => {
      if (caminho.includes('revogacao')) {
        lista = [];
        return resposta(null, 204);
      }
      return resposta({ id: 'c1', link: 'https://web/compartilhado/abc', escopos: ['VACINAS', 'ALERGIAS'] }, 201);
    }) as never);
    await render(<Compartilhar />);
    await fireEvent.press(await screen.findByRole('radio', { name: 'Pessoa por e-mail' }));
    expect(screen.queryByRole('checkbox', { name: 'Registrar na saúde (só empresas)' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('E-mail de quem recebe'), 'avo@exemplo.com');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Perfil básico' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Vacinas' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Alergias' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Sem prazo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Compartilhar' }));
    expect(await screen.findByText('Perfil compartilhado')).toBeOnTheScreen();
    expect(post).toHaveBeenCalledWith('/pets/{petId}/compartilhamentos', {
      params: { path: { petId: 'p1' } },
      body: { escopos: ['VACINAS', 'ALERGIAS'], destinatarioEmail: 'avo@exemplo.com' },
    });
    expect(screen.getByRole('button', { name: 'Enviar o link' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Revogar acesso de vet@exemplo.com' }));
    expect(await screen.findByText('Acesso revogado')).toBeOnTheScreen();
  });

  it('deve compartilhar com uma empresa encontrada na busca', async () => {
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/empresas' ? resposta({ itens: [{ id: 'e1', nomeFantasia: 'Clínica Patas' }], total: 1 }) : resposta([])) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta({ id: 'c2' }, 201) as never);
    await render(<Compartilhar />);
    await fireEvent.changeText(await screen.findByLabelText('Buscar empresa'), 'patas');
    await fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'Clínica Patas' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Registrar na saúde (só empresas)' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Compartilhar' }));
    const corpo = (post.mock.calls[0]?.[1] as { body: Record<string, unknown> }).body;
    expect(corpo).toMatchObject({ empresaId: 'e1', escopos: ['PERFIL_BASICO', 'EDICAO_CLINICA'] });
    expect(typeof corpo.dataExpiracao).toBe('string');
  });

  it('mostra o nome da empresa com quem o perfil foi compartilhado', async () => {
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/empresas/{empresaId}'
        ? resposta({ id: 'e1', nomeFantasia: 'Clínica Patas' })
        : resposta([{ id: 'c0', empresaId: 'e1', escopos: ['VACINAS'], status: 'ATIVO' }])) as never);
    await render(<Compartilhar />);
    expect(await screen.findByText('Clínica Patas')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Revogar acesso de Clínica Patas' })).toBeOnTheScreen();
  });
});
