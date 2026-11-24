/** Formulário de medicamento do pet (UC-14, RN18). */
import { dataBr, dataIso } from '../pets/formulario';

export interface ValoresTratamento {
  medicamento: string;
  dosagem: string;
  via: string;
  intervalo: string; // horas
  inicio: string; // DD/MM/AAAA
  fim: string; // DD/MM/AAAA ou vazio
  primeiraDose: string; // HH:MM
  observacoes: string;
}

export const VIAS = ['Oral', 'Injetável', 'Tópica', 'Colírio', 'Otológica', 'Outra'];
export const INTERVALOS = ['6', '8', '12', '24'];

const horaValida = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);

export function montarTratamento(v: ValoresTratamento, hoje: string) {
  const erros: Partial<Record<keyof ValoresTratamento, string>> = {};
  if (!v.medicamento.trim()) erros.medicamento = 'Informe o medicamento.';
  if (!v.dosagem.trim()) erros.dosagem = 'Informe a dose, por exemplo "1 comprimido".';
  if (!v.via.trim()) erros.via = 'Escolha como o remédio é dado.';
  const intervalo = Number(v.intervalo);
  if (!Number.isInteger(intervalo) || intervalo < 1 || intervalo > 720) {
    erros.intervalo = 'Informe o intervalo em horas (1 a 720).';
  }
  const inicio = dataIso(v.inicio);
  if (!inicio) erros.inicio = 'Informe o início como DD/MM/AAAA.';
  const fim = v.fim ? dataIso(v.fim) : null;
  if (v.fim && !fim) erros.fim = 'Informe o fim como DD/MM/AAAA.';
  if (inicio && fim && fim < inicio) erros.fim = 'O fim precisa ser no dia do início ou depois.';
  if (fim && fim < hoje) erros.fim = 'Informe um fim a partir de hoje.';
  if (!horaValida(v.primeiraDose)) erros.primeiraDose = 'Informe a hora como HH:MM.';
  if (Object.keys(erros).length > 0 || !inicio) return { ok: false as const, erros };
  return {
    ok: true as const,
    corpo: {
      medicamento: v.medicamento.trim(),
      dosagem: v.dosagem.trim(),
      viaAdministracao: v.via.trim(),
      intervaloHoras: intervalo,
      dataInicio: inicio,
      horaPrimeiraDose: v.primeiraDose,
      ...(fim ? { dataFim: fim } : {}),
      ...(v.observacoes.trim() ? { observacoes: v.observacoes.trim() } : {}),
    },
  };
}

/** "De 8 em 8 horas · 23/11/2026 a 30/11/2026". */
export function resumoTratamento(t: { intervaloHoras?: number; dataInicio?: string; dataFim?: string }) {
  const intervalo = t.intervaloHoras === 24 ? 'Uma vez por dia' : `De ${t.intervaloHoras} em ${t.intervaloHoras} horas`;
  const periodo = t.dataFim ? `${dataBr(t.dataInicio)} a ${dataBr(t.dataFim)}` : `desde ${dataBr(t.dataInicio)}`;
  return `${intervalo} · ${periodo}`;
}
