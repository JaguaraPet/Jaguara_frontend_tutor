import { Platform } from 'react-native';

/**
 * Endereço da API. No celular vem de EXPO_PUBLIC_API_URL (em desenvolvimento, o IP do
 * computador). Na versão web publicada (tutor.X), sai do próprio domínio: api.X.
 */
export function urlDaApi(
  plataforma: string,
  endereco: { protocol: string; hostname: string } | undefined,
  configurada?: string,
): string {
  if (plataforma === 'web' && endereco) {
    const local =
      /^(localhost|127\.0\.0\.1|\[::1\])$/.test(endereco.hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(endereco.hostname);
    if (!local) return `${endereco.protocol}//api.${endereco.hostname.replace(/^(app|tutor|www)\./, '')}/v1`;
  }
  return configurada || 'http://localhost:3000/v1';
}

export const URL_API: string = urlDaApi(
  Platform.OS,
  typeof window !== 'undefined' && window.location ? window.location : undefined,
  process.env.EXPO_PUBLIC_API_URL,
);
