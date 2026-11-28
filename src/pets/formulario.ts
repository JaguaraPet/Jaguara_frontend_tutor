import type { components } from '../api/esquema';

export type PetEntrada = components['schemas']['PetEntrada'];
export type Especie = components['schemas']['Especie'];

/** Valores do formulário, como o tutor digita. */
export interface ValoresPet {
  nome: string;
  especieId: string;
  racaId: string;
  /** Raça escrita quando a escolhida é "Outra (digitar)". */
  racaDescricao: string;
  sexo: 'MACHO' | 'FEMEA' | '';
  /** DD/MM/AAAA, opcional. */
  nascimento: string;
  /** Peso com vírgula ou ponto, opcional. */
  peso: string;
  cor: string;
  microchip: string;
  castrado: boolean;
}

export const VAZIO: ValoresPet = {
  nome: '',
  especieId: '',
  racaId: '',
  racaDescricao: '',
  sexo: '',
  nascimento: '',
  peso: '',
  cor: '',
  microchip: '',
  castrado: false,
};

/** "05/03/2021" para "2021-03-05"; null se a data não existe. */
export function dataIso(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const iso = `${ano}-${mes}-${dia}`;
  const data = new Date(`${iso}T12:00:00Z`);
  return data.toISOString().slice(0, 10) === iso ? iso : null;
}

/** "2021-03-05" para "05/03/2021". */
export function dataBr(iso?: string): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

/** Máscara de data enquanto o tutor digita: só números, barras automáticas. */
export function mascararData(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** As espécies que mais aparecem nas clínicas vêm primeiro, nesta ordem. */
const MAIS_COMUNS = ['Cachorro', 'Gato', 'Ave', 'Roedor', 'Coelho', 'Peixe', 'Réptil'];

/** Mais comuns primeiro, depois as outras em ordem alfabética e "Outro" no fim. */
export function ordenarEspecies<T extends { nome?: string }>(especies: T[]): T[] {
  const posicao = (e: T) => {
    const i = MAIS_COMUNS.indexOf(e.nome ?? '');
    if (i >= 0) return i;
    return e.nome === 'Outro' ? 2 * MAIS_COMUNS.length : MAIS_COMUNS.length;
  };
  return [...especies].sort((a, b) => posicao(a) - posicao(b) || (a.nome ?? '').localeCompare(b.nome ?? '', 'pt-BR'));
}

/** Raça do catálogo em que o tutor escreve a raça do pet. */
export const RACA_OUTRA = 'Outra (digitar)';

/** As raças que combinam com a busca, sem acento e sem caixa; a lista inteira sem busca. */
export function filtrarRacas<T extends { nome?: string }>(racas: T[], busca: string): T[] {
  const normal = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const termo = normal(busca.trim());
  if (!termo) return racas;
  return racas.filter((r) => normal(r.nome ?? '').includes(termo) || r.nome === RACA_OUTRA);
}

export type ErrosPet = Partial<Record<keyof ValoresPet, string>>;

/** Validação no aparelho, com mensagens que dizem o que corrigir (UX-02, seção 6). */
export function validar(v: ValoresPet, hoje: string, racaOutra = false): ErrosPet {
  const erros: ErrosPet = {};
  if (!v.nome.trim()) erros.nome = 'Informe o nome do pet.';
  if (!v.especieId) erros.especieId = 'Escolha a espécie.';
  else if (!v.racaId) erros.racaId = 'Escolha a raça (ou Sem raça definida).';
  else if (racaOutra && !v.racaDescricao.trim()) erros.racaDescricao = 'Escreva a raça do pet.';
  if (!v.sexo) erros.sexo = 'Escolha o sexo.';
  if (v.nascimento) {
    const iso = dataIso(v.nascimento);
    if (!iso) erros.nascimento = 'Use o formato DD/MM/AAAA.';
    else if (iso > hoje) erros.nascimento = 'A data não pode ser futura.';
  }
  if (v.peso) {
    const peso = Number(v.peso.replace(',', '.'));
    if (!Number.isFinite(peso) || peso <= 0 || peso > 500)
      erros.peso = 'Informe o peso em kg, por exemplo 12,5.';
  }
  return erros;
}

/** Corpo do POST/PATCH /pets a partir do formulário já validado. */
export function paraEntrada(v: ValoresPet, racaOutra = false): PetEntrada {
  return {
    nome: v.nome.trim(),
    racaId: v.racaId,
    ...(racaOutra ? { racaDescricao: v.racaDescricao.trim() } : {}),
    sexo: v.sexo as 'MACHO' | 'FEMEA',
    castrado: v.castrado,
    ...(v.nascimento ? { dataNascimento: dataIso(v.nascimento)! } : {}),
    ...(v.peso ? { pesoKg: Number(v.peso.replace(',', '.')) } : {}),
    ...(v.cor.trim() ? { cor: v.cor.trim() } : {}),
    ...(v.microchip.trim() ? { microchip: v.microchip.trim() } : {}),
  };
}
