/** Registro de vacinação no app (UC-13, RN17). */
import { dataIso } from '../pets/formulario';

export interface ValoresVacina {
  nome: string;
  fabricante: string;
  lote: string;
  aplicacao: string; // DD/MM/AAAA
  proximaDose: string; // DD/MM/AAAA ou vazio
  responsavel: string;
  observacoes: string;
}

export function montarVacina(v: ValoresVacina, hoje: string) {
  const erros: Partial<Record<keyof ValoresVacina, string>> = {};
  if (!v.nome.trim()) erros.nome = 'Informe a vacina.';
  const aplicacao = dataIso(v.aplicacao);
  if (!aplicacao) erros.aplicacao = 'Informe a data como DD/MM/AAAA.';
  else if (aplicacao > hoje) erros.aplicacao = 'A data de aplicação não pode ser futura.';
  const proxima = v.proximaDose ? dataIso(v.proximaDose) : null;
  if (v.proximaDose && !proxima) erros.proximaDose = 'Informe a data como DD/MM/AAAA.';
  if (aplicacao && proxima && proxima <= aplicacao) {
    erros.proximaDose = 'A próxima dose precisa ser depois da aplicação.';
  }
  // RN17: toda vacinação tem o responsável pela aplicação.
  if (!v.responsavel.trim()) erros.responsavel = 'Informe quem aplicou a vacina.';
  if (Object.keys(erros).length > 0 || !aplicacao) return { ok: false as const, erros };
  return {
    ok: true as const,
    corpo: {
      nomeVacina: v.nome.trim(),
      dataAplicacao: aplicacao,
      responsavelAplicacao: v.responsavel.trim(),
      ...(proxima ? { dataProximaDose: proxima } : {}),
      ...(v.fabricante.trim() ? { fabricante: v.fabricante.trim() } : {}),
      ...(v.lote.trim() ? { lote: v.lote.trim() } : {}),
      ...(v.observacoes.trim() ? { observacoes: v.observacoes.trim() } : {}),
    },
  };
}
