/**
 * Tokens visuais do UX-02 (guia de estilo), os mesmos da web Enterprise.
 * Este arquivo é idêntico em Jaguara_frontend_tutor e Jaguara_frontend_enterprise:
 * mudou um, mude o outro. O contraste dos pares de texto foi verificado no UX-02 (WCAG AA).
 */
export const cores = {
  primaria: '#8A4B0F',
  primariaEscura: '#5E3209',
  secundaria: '#1F5C4A',
  fundo: '#FFFFFF',
  superficie: '#F7F3EE',
  texto: '#1E1B18',
  textoSecundario: '#5C554E',
  sucesso: '#1E7B3A',
  alerta: '#8A5A00',
  erro: '#B3261E',
  borda: '#D9D1C7',
  branco: '#FFFFFF',
  /** Fundo dos estados desabilitados: texto `textoSecundario` sobre ele mantém 4,5:1. */
  desabilitado: '#ECE6DF',
} as const;

/** Fundos suaves para alertas e etiquetas; o texto usa a cor cheia correspondente. */
export const coresSuaves = {
  sucesso: '#E6F2EA',
  alerta: '#FBF1DD',
  erro: '#FBE9E7',
  info: '#E7F0ED',
} as const;

export const fonte = {
  familia: 'Inter',
  titulo1: { tamanho: 28, peso: '700', alturaLinha: 36 },
  titulo2: { tamanho: 22, peso: '600', alturaLinha: 30 },
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

export const raio = { padrao: 8 } as const;

/** Área mínima de toque (WCAG 2.5.8). */
export const alvoToqueMinimo = 44;
