/**
 * Paletas da identidade Selvagem (UX-02, seção 2). Os nomes das cores vêm da planilha de
 * identidade: Areia, Mata Fechada, Ouro Onça, Ouro Queimado, Igarapé, Dossel, Urucum.
 * Este arquivo é igual em app/src/tema e web/src/tema: mudou um, mude o outro.
 */
export type Modo = 'claro' | 'escuro';

export interface Cores {
  /** Ouro Onça: fundo dos botões principais e das escolhas marcadas. */
  primaria: string;
  primariaEscura: string;
  /** Texto e ícone sobre a primária. */
  sobrePrimaria: string;
  /** Dourado para texto e ícone sobre o fundo (Ouro Queimado no claro). */
  destaque: string;
  /** Igarapé: links, botões de contorno e ícones de informação. */
  secundaria: string;
  fundo: string;
  /** Fundo opaco suave: estados pressionados e áreas de apoio. */
  superficie: string;
  /** Fundo opaco elevado: menus, campos e balões. */
  elevado: string;
  /** Cartão translúcido sobre o fundo com a estampa. */
  cartao: string;
  cartaoBorda: string;
  texto: string;
  textoSecundario: string;
  sucesso: string;
  alerta: string;
  erro: string;
  erroEscuro: string;
  borda: string;
  /** Texto e ícone sobre secundária, sucesso e erro. */
  sobreCor: string;
  /** Branco de verdade (borda de foto, por exemplo), igual nos dois modos. */
  branco: string;
  /** Fundo dos estados desabilitados: texto `textoSecundario` sobre ele mantém 4,5:1. */
  desabilitado: string;
  /** Barra de abas. */
  barra: string;
  /** Faixa de destaque (aniversário, avisos especiais). */
  destaqueFundo: string;
  destaqueBorda: string;
  /** Véu escuro atrás de menus. */
  veu: string;
}

export interface CoresSuaves {
  sucesso: string;
  alerta: string;
  erro: string;
  info: string;
}

export const PALETAS: Record<Modo, Cores> = {
  claro: {
    primaria: '#F5B301',
    primariaEscura: '#DDA000',
    sobrePrimaria: '#14130F',
    destaque: '#7E5800',
    secundaria: '#0B6670',
    fundo: '#FAF6EC',
    superficie: '#EFEBDD',
    elevado: '#FFFFFF',
    cartao: 'rgba(31, 94, 59, 0.07)',
    cartaoBorda: 'rgba(31, 94, 59, 0.18)',
    texto: '#14130F',
    textoSecundario: '#5E6359',
    sucesso: '#1D6A40',
    alerta: '#8A5A00',
    erro: '#B3261E',
    erroEscuro: '#8C1D17',
    borda: '#D3D8C8',
    sobreCor: '#FFFFFF',
    branco: '#FFFFFF',
    desabilitado: '#E6E2D4',
    barra: '#FFFFFF',
    destaqueFundo: 'rgba(245, 179, 1, 0.14)',
    destaqueBorda: 'rgba(140, 98, 0, 0.22)',
    veu: 'rgba(20, 19, 15, 0.3)',
  },
  escuro: {
    primaria: '#F5B301',
    primariaEscura: '#FFC93D',
    sobrePrimaria: '#14130F',
    destaque: '#F5B301',
    secundaria: '#3FB6C1',
    fundo: '#0B1D14',
    superficie: '#1A3324',
    elevado: '#13291D',
    cartao: 'rgba(168, 198, 134, 0.16)',
    cartaoBorda: 'rgba(168, 198, 134, 0.4)',
    texto: '#FAF6EC',
    textoSecundario: '#9FB8A6',
    sucesso: '#4FBF8A',
    alerta: '#F5B301',
    erro: '#F07A5C',
    erroEscuro: '#D9654A',
    borda: '#2C4A38',
    sobreCor: '#0B1D14',
    branco: '#FFFFFF',
    desabilitado: '#1F3328',
    barra: '#13291D',
    destaqueFundo: 'rgba(245, 179, 1, 0.1)',
    destaqueBorda: 'rgba(245, 179, 1, 0.3)',
    veu: 'rgba(0, 0, 0, 0.5)',
  },
};

export const SUAVES: Record<Modo, CoresSuaves> = {
  claro: { sucesso: '#E3EFE7', alerta: '#FBF0D2', erro: '#FBE6E1', info: '#E0EFF0' },
  escuro: { sucesso: '#173A27', alerta: '#3A3110', erro: '#40211A', info: '#0F3338' },
};
