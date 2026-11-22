/** Datas e horários da solicitação de agendamento (UC-40), no fuso de Brasília. */

const FUSO = 'America/Sao_Paulo';

/** Os próximos `quantos` dias a partir de hoje, em AAAA-MM-DD. */
export function proximosDias(hoje: string, quantos = 14): string[] {
  const dias: string[] = [];
  const d = new Date(`${hoje}T12:00:00Z`);
  for (let i = 0; i < quantos; i++) {
    dias.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dias;
}

/** "sáb., 22/11" para o botão do dia. */
export function rotuloDia(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  const semana = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' });
  return `${semana} ${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}

/** Hora HH:MM de Brasília de um instante ISO. */
export function horaBrasilia(instante: string): string {
  return new Date(instante).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO });
}
