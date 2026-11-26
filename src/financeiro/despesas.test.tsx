import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { File } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { api } from '../api/cliente';
import Despesas from '../app/pets/[petId]/despesas';
import { periodoDoMes, reais, valorDigitado } from './relatorio';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ petId: 'p1' }),
}));
jest.mock('expo-file-system', () => {
  class FileFalso {
    uri = 'file:///cache/relatorio.pdf';
    exists = false;
    delete = jest.fn();
    static downloadFileAsync = jest.fn(() => Promise.resolve(new FileFalso()));
  }
  return { File: FileFalso, Paths: { cache: {} } };
});
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn(() => Promise.resolve()) }));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

describe('UC-06 e UC-07 · Despesas e relatório no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve montar o período do mês e ler o valor digitado', () => {
    expect(periodoDoMes('2026-11-25')).toMatchObject({ de: '2026-11-01', ate: '2026-11-30' });
    expect(periodoDoMes('2026-01-10', -1)).toMatchObject({ de: '2025-12-01', ate: '2025-12-31' });
    expect(valorDigitado('1.234,50')).toBe(1234.5);
    expect(valorDigitado('0')).toBeNull();
    expect(valorDigitado('12,345')).toBeNull();
    expect(reais(1234.5)).toBe('R$ 1.234,50');
  });

  it('CT-07-01: deve mostrar o total por categoria e baixar o PDF', async () => {
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) => {
      if (caminho === '/categorias-despesa') return resposta([{ id: 'c1', nome: 'Alimentação' }]);
      if (caminho === '/relatorios/despesas') {
        return resposta({ de: '', ate: '', total: 215.4, porCategoria: [{ categoria: 'Alimentação', quantidade: 2, total: 215.4 }], despesas: [] });
      }
      return resposta([{ id: 'd1', descricao: 'Ração 15 kg', valor: 189.9, data: '2026-11-02', categoriaId: 'c1', categoria: 'Alimentação' }]);
    }) as never);
    await render(<Despesas />);
    expect(await screen.findByText(/^Total de .*: R\$ 215,40$/)).toBeOnTheScreen();
    expect(screen.getByText('Ração 15 kg')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar relatório em PDF' }));
    const download = (File as unknown as { downloadFileAsync: jest.Mock }).downloadFileAsync;
    expect(download.mock.calls[0]?.[0]).toMatch(/\/relatorios\/despesas\?de=.*&petId=p1$/);
    expect(shareAsync).toHaveBeenCalledWith('file:///cache/relatorio.pdf', expect.objectContaining({ mimeType: 'application/pdf' }));
  });

  it('CT-06-02 e CT-07-02: deve exigir categoria e mostrar mês sem despesas', async () => {
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) => {
      if (caminho === '/categorias-despesa') return resposta([{ id: 'c1', nome: 'Saúde' }]);
      if (caminho === '/relatorios/despesas') return resposta({ codigo: 'RN11_SEM_DADOS' }, 404);
      return resposta([]);
    }) as never);
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta({ id: 'd2' }, 201) as never);
    await render(<Despesas />);
    expect(await screen.findByText(/Não há despesas em/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Baixar relatório em PDF' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar despesa' }));
    await fireEvent.changeText(screen.getByLabelText('Descrição'), 'Consulta');
    await fireEvent.changeText(screen.getByLabelText('Valor (R$)'), '150');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar despesa' }));
    expect(screen.getByText('Escolha uma categoria.')).toBeOnTheScreen();
    expect(post).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('radio', { name: 'Saúde' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar despesa' }));
    expect(await screen.findByText('Despesa registrada')).toBeOnTheScreen();
  });
});
