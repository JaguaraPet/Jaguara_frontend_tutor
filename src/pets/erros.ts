/** Mensagem para o tutor a partir do problem+json da API. */
export function mensagemDaApi(erro: unknown): string {
  const problema = erro as { detail?: string; title?: string; campos?: { mensagem: string }[] };
  if (problema?.campos?.length) return problema.campos.map((c) => c.mensagem).join(' ');
  return problema?.detail ?? problema?.title ?? 'Tente de novo em instantes.';
}
