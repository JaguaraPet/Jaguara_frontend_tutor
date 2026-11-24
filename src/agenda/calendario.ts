/** Google Agenda (UC-09): retorno do consentimento e o aviso de cada resultado. */
export type Aviso = { tipo: 'sucesso' | 'erro' | 'alerta' | 'info'; titulo: string; mensagem?: string };

/** Para onde a API devolve o tutor depois do consentimento do Google (URL_APP + /calendario). */
export const RETORNO = 'jaguara://calendario';

/** Texto do resultado que a API manda na volta do Google (?resultado=). */
export function avisoDoRetorno(resultado?: string): Aviso | null {
  if (resultado === 'conectado') return { tipo: 'sucesso', titulo: 'Google Agenda conectado', mensagem: 'Escolha o pet e toque em Sincronizar agora.' };
  if (resultado === 'negado') return { tipo: 'alerta', titulo: 'Acesso não autorizado', mensagem: 'Nada foi importado. Você pode tentar de novo quando quiser.' };
  if (resultado === 'erro') return { tipo: 'erro', titulo: 'Não foi possível conectar', mensagem: 'Tente de novo em instantes.' };
  return null;
}

