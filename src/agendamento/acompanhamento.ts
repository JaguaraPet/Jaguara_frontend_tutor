/** Textos do acompanhamento de solicitações no app (UC-42). */
import type { components } from '../api/esquema';

type Detalhe = components['schemas']['DetalheSolicitacao'];

const STATUS: Record<string, string> = {
  PENDENTE: 'Aguardando a empresa',
  ACEITA: 'Confirmada',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada',
  CONCLUIDA: 'Concluída',
  ENCERRADA: 'Encerrada',
};

/** Status para o tutor; aceita e paga aparece como "Confirmada e paga". */
export function rotuloStatus(s: Pick<Detalhe, 'status' | 'agendamento'>): string {
  if (s.status === 'ACEITA' && s.agendamento?.pagamento === 'ACEITO') return 'Confirmada e paga';
  if (s.status === 'ACEITA' && s.agendamento?.pagamento === 'PENDENTE') return 'Confirmada, pagamento em andamento';
  return STATUS[s.status] ?? s.status;
}

export const rotuloStatusSimples = (status?: string) => (status ? (STATUS[status] ?? status) : '');

/** Horário confirmado (do agendamento) ou o desejado, no fuso de Brasília. */
export function quandoSolicitacao(s: Pick<Detalhe, 'dataHoraDesejada' | 'agendamento'>): string {
  const iso = s.agendamento?.dataHoraInicio ?? s.dataHoraDesejada;
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Pode pagar: aceita, com agendamento ativo e sem pagamento confirmado ou em andamento. */
export function podePagar(s: Pick<Detalhe, 'status' | 'agendamento'>): boolean {
  return (
    s.status === 'ACEITA' &&
    s.agendamento?.status === 'AGENDADO' &&
    s.agendamento.pagamento !== 'ACEITO' &&
    s.agendamento.pagamento !== 'PENDENTE'
  );
}
