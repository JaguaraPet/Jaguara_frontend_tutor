/** Compartilhar o perfil do pet (UC-11, RN15). */
import type { components } from '../api/esquema';

export type Escopo = components['schemas']['CompartilhamentoEntrada']['escopos'][number];

export const ESCOPOS: { valor: Escopo; rotulo: string }[] = [
  { valor: 'PERFIL_BASICO', rotulo: 'Perfil básico' },
  { valor: 'VACINAS', rotulo: 'Vacinas' },
  { valor: 'ALERGIAS', rotulo: 'Alergias' },
  { valor: 'MEDICAMENTOS', rotulo: 'Medicamentos' },
  { valor: 'EXAMES', rotulo: 'Exames' },
  { valor: 'DOCUMENTOS', rotulo: 'Documentos' },
  { valor: 'LINHA_DO_TEMPO', rotulo: 'Linha do tempo' },
  { valor: 'EDICAO_CLINICA', rotulo: 'Registrar na saúde (só empresas)' },
];

export const rotuloEscopo = (e: string) => ESCOPOS.find((x) => x.valor === e)?.rotulo ?? e;

/** Validade em dias; zero é sem prazo. */
export const VALIDADES: { valor: string; rotulo: string }[] = [
  { valor: '7', rotulo: '7 dias' },
  { valor: '30', rotulo: '30 dias' },
  { valor: '90', rotulo: '90 dias' },
  { valor: '0', rotulo: 'Sem prazo' },
];

export function dataExpiracao(dias: string, agora = new Date()): string | undefined {
  const n = Number(dias);
  return n > 0 ? new Date(agora.getTime() + n * 86_400_000).toISOString() : undefined;
}

/** O que corrigir antes de compartilhar, ou null. Edição clínica só faz sentido para empresa. */
export function problemaNoCompartilhamento(c: {
  modo: 'EMAIL' | 'EMPRESA';
  email: string;
  empresaId: string;
  escopos: Escopo[];
}): string | null {
  if (c.escopos.length === 0) return 'Escolha o que compartilhar.';
  if (c.modo === 'EMAIL') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) return 'Informe o e-mail de quem vai receber.';
    if (c.escopos.includes('EDICAO_CLINICA')) return 'Registrar na saúde vale só para empresas.';
  } else if (!c.empresaId) {
    return 'Escolha a empresa.';
  }
  return null;
}
