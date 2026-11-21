/** Data AAAA-MM-DD de hoje em Brasília. */
export function hojeBrasilia(agora: Date = new Date()): string {
  return new Date(agora.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}
