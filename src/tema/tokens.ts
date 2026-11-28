/**
 * Tokens visuais da identidade Selvagem (UX-02), os mesmos da web Enterprise.
 * As duas paletas, clara e escura, ficam em `paletas.ts`. O contraste dos pares de texto
 * foi verificado no UX-02 (WCAG AA) nos dois modos.
 *
 * `cores` e `coresSuaves` guardam a paleta do modo em uso: `aplicarModo` troca os valores e o
 * layout raiz remonta as telas. Por isso os estilos usam `criarEstilos` (tema/estilos.ts), que
 * refaz o StyleSheet quando o modo muda.
 */
import { PALETAS, SUAVES } from './paletas';
import type { Cores, CoresSuaves, Modo } from './paletas';

export type { Cores, CoresSuaves, Modo } from './paletas';

export const cores: Cores = { ...PALETAS.claro };

/** Fundos suaves para alertas e etiquetas; o texto usa a cor cheia correspondente. */
export const coresSuaves: CoresSuaves = { ...SUAVES.claro };

let modoAtual: Modo = 'claro';
let versao = 0;

/** Troca a paleta em uso. Devolve true quando o modo mudou. */
export function aplicarModo(modo: Modo): boolean {
  if (modo === modoAtual) return false;
  Object.assign(cores, PALETAS[modo]);
  Object.assign(coresSuaves, SUAVES[modo]);
  modoAtual = modo;
  versao += 1;
  return true;
}

export const modoEmUso = (): Modo => modoAtual;
/** Muda a cada troca de modo; os estilos comparam com ela para saber se estão velhos. */
export const versaoDoTema = (): number => versao;

export const fonte = {
  familia: 'Inter',
  /** Títulos em Bricolage Grotesque, com só a primeira letra maiúscula. */
  familiaTitulo: 'Bricolage-ExtraBold',
  titulo1: { tamanho: 30, peso: '800', alturaLinha: 36 },
  titulo2: { tamanho: 20, peso: '800', alturaLinha: 26 },
  corpo: { tamanho: 16, peso: '400', alturaLinha: 24 },
  legenda: { tamanho: 14, peso: '400', alturaLinha: 20 },
} as const;

/** Espaçamento em múltiplos da base de 4 px. */
export const espaco = {
  base: 4,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Campos ficam com o raio padrão; cartões arredondam mais e botões viram pílulas. */
export const raio = { padrao: 10, cartao: 20, pilula: 999 } as const;

/** Área mínima de toque (WCAG 2.5.8). */
export const alvoToqueMinimo = 44;
