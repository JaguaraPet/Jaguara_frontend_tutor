/** Agenda e eventos do pet no app (UC-10, RN14), no fuso de Brasília. */
import { dataIso } from '../pets/formulario';

export type TipoEvento =
  | 'CONSULTA'
  | 'VACINA'
  | 'MEDICAMENTO'
  | 'EXAME'
  | 'CIRURGIA'
  | 'BANHO_TOSA'
  | 'HOSPEDAGEM'
  | 'COMPROMISSO'
  | 'OUTRO';

export const TIPOS_EVENTO: { valor: TipoEvento; rotulo: string }[] = [
  { valor: 'CONSULTA', rotulo: 'Consulta' },
  { valor: 'VACINA', rotulo: 'Vacina' },
  { valor: 'MEDICAMENTO', rotulo: 'Medicamento' },
  { valor: 'EXAME', rotulo: 'Exame' },
  { valor: 'BANHO_TOSA', rotulo: 'Banho e tosa' },
  { valor: 'CIRURGIA', rotulo: 'Cirurgia' },
  { valor: 'HOSPEDAGEM', rotulo: 'Hospedagem' },
  { valor: 'COMPROMISSO', rotulo: 'Compromisso' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];

const FUSO = 'America/Sao_Paulo';

/** Dia AAAA-MM-DD de Brasília de um instante. */
export const diaDe = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: FUSO });

export const horaDe = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO });

/** "sábado, 28 de novembro". */
export const rotuloDoDia = (dia: string) =>
  new Date(`${dia}T12:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

/** Eventos agrupados por dia, em ordem. */
export function porDia<T extends { dataHoraInicio: string }>(eventos: T[]): { dia: string; eventos: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const e of [...eventos].sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))) {
    const dia = diaDe(e.dataHoraInicio);
    grupos.set(dia, [...(grupos.get(dia) ?? []), e]);
  }
  return [...grupos.entries()].map(([dia, lista]) => ({ dia, eventos: lista }));
}

/** Mascara HH:MM enquanto digita. */
export function mascararHora(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)}:${n.slice(2)}` : n;
}

const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

export interface ValoresEvento {
  titulo: string;
  tipo: TipoEvento;
  data: string; // DD/MM/AAAA
  inicio: string; // HH:MM
  fim: string; // HH:MM ou vazio
  local: string;
  descricao: string;
}

/** Valida e monta o corpo da API, ou devolve os erros por campo. */
export function montarEvento(
  v: ValoresEvento,
  agora = new Date(),
):
  | { ok: true; corpo: { titulo: string; tipo: TipoEvento; dataHoraInicio: string; dataHoraFim?: string; local?: string; descricao?: string } }
  | { ok: false; erros: Partial<Record<keyof ValoresEvento, string>> } {
  const erros: Partial<Record<keyof ValoresEvento, string>> = {};
  if (!v.titulo.trim()) erros.titulo = 'Dê um título ao evento.';
  const dia = dataIso(v.data);
  if (!dia) erros.data = 'Informe a data como DD/MM/AAAA.';
  if (!horaValida(v.inicio)) erros.inicio = 'Informe a hora como HH:MM.';
  if (v.fim && !horaValida(v.fim)) erros.fim = 'Informe a hora como HH:MM.';
  if (dia && horaValida(v.inicio)) {
    const inicio = new Date(`${dia}T${v.inicio}:00-03:00`);
    if (inicio < agora) erros.data = 'Escolha uma data e hora a partir de agora.';
    if (v.fim && horaValida(v.fim) && v.fim <= v.inicio) erros.fim = 'O fim precisa ser depois do início.';
  }
  if (Object.keys(erros).length > 0 || !dia) return { ok: false, erros };
  return {
    ok: true,
    corpo: {
      titulo: v.titulo.trim(),
      tipo: v.tipo,
      dataHoraInicio: new Date(`${dia}T${v.inicio}:00-03:00`).toISOString(),
      ...(v.fim ? { dataHoraFim: new Date(`${dia}T${v.fim}:00-03:00`).toISOString() } : {}),
      ...(v.local.trim() ? { local: v.local.trim() } : {}),
      ...(v.descricao.trim() ? { descricao: v.descricao.trim() } : {}),
    },
  };
}
