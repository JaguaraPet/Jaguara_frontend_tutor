import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { URL_API } from '../api/config';
import { sessao } from '../sessao/sessao';

/** Primeiro e último dia do mês de `base` deslocado `meses`, em AAAA-MM-DD. */
export function periodoDoMes(base: string, meses = 0): { de: string; ate: string; rotulo: string } {
  const [a, m] = base.split('-').map(Number);
  const inicio = new Date(Date.UTC(a, m - 1 + meses, 1));
  const fim = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const rotulo = inicio.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { de: iso(inicio), ate: iso(fim), rotulo };
}

export const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** Valor digitado ("12,50" ou "12.50") em número; null quando não serve. */
export function valorDigitado(texto: string): number | null {
  const n = Number(texto.trim().replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 && Math.round(n * 100) === n * 100 ? n : null;
}

/**
 * Baixa o relatório em PDF (RN11) com o token da sessão e abre o compartilhamento do sistema,
 * para o tutor salvar ou mandar o arquivo.
 */
export async function baixarRelatorioPdf(filtro: { de: string; ate: string; petId?: string }): Promise<void> {
  const consulta = new URLSearchParams({ de: filtro.de, ate: filtro.ate, ...(filtro.petId ? { petId: filtro.petId } : {}) });
  const destino = new File(Paths.cache, `despesas-${filtro.de}-a-${filtro.ate}.pdf`);
  if (destino.exists) destino.delete();
  const arquivo = await File.downloadFileAsync(`${URL_API}/relatorios/despesas?${consulta.toString()}`, destino, {
    headers: { Accept: 'application/pdf', Authorization: `Bearer ${sessao.accessToken ?? ''}` },
  });
  await shareAsync(arquivo.uri, { mimeType: 'application/pdf', dialogTitle: 'Relatório de despesas' });
}
