/**
 * Sessão do app (ADR-009, ADR-012): o access token fica só em memória e o refresh token no
 * armazenamento seguro do aparelho (Keychain no iOS, Keystore no Android), via expo-secure-store.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { URL_API } from '../api/config';

export type TipoUsuario = 'TUTOR' | 'EMPRESA' | 'FUNCIONARIO' | 'ADMINISTRADOR';

export interface Usuario {
  id: string;
  tipo: TipoUsuario;
  perfil: string;
  permissoes: string[];
}

export interface Problema {
  title?: string;
  detail?: string;
  codigo?: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const CHAVE_REFRESH = 'jaguara.refreshToken';

let accessToken: string | null = null;
let usuario: Usuario | null = null;
let renovando: Promise<boolean> | null = null;
const ouvintes = new Set<() => void>();

/** No navegador (expo web) não há armazenamento seguro: a sessão vale só enquanto a página estiver aberta. */
const armazenamento = {
  ler: () => (Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(CHAVE_REFRESH)),
  gravar: (valor: string) =>
    Platform.OS === 'web' ? Promise.resolve() : SecureStore.setItemAsync(CHAVE_REFRESH, valor),
  apagar: () => (Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(CHAVE_REFRESH)),
};

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

/** Lê o conteúdo do JWT (sem validar: quem valida é a API). */
export function lerToken(token: string): Usuario {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    [...atob(base64)].map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
  );
  const dados = JSON.parse(json) as Omit<Usuario, 'id'> & { sub: string };
  return { id: dados.sub, tipo: dados.tipo, perfil: dados.perfil, permissoes: dados.permissoes };
}

export class ErroApi extends Error {
  readonly problema: Problema;

  constructor(problema: Problema) {
    super(problema.detail ?? problema.title ?? 'Erro na API');
    this.problema = problema;
  }
}

async function guardar(tokens: Tokens) {
  accessToken = tokens.accessToken;
  usuario = lerToken(tokens.accessToken);
  await armazenamento.gravar(tokens.refreshToken);
  avisar();
}

async function limpar() {
  accessToken = null;
  usuario = null;
  await armazenamento.apagar();
  avisar();
}

async function postar(caminho: string, corpo?: unknown, token?: string) {
  return fetch(`${URL_API}${caminho}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

export const sessao = {
  get accessToken() {
    return accessToken;
  },
  get usuario() {
    return usuario;
  },
  ouvir(ouvinte: () => void) {
    ouvintes.add(ouvinte);
    return () => {
      ouvintes.delete(ouvinte);
    };
  },

  /** UC-02: entra com e-mail e senha. Só tutores usam o app. */
  async entrar(email: string, senha: string): Promise<Usuario> {
    const resposta = await postar('/auth/login', { email, senha });
    if (!resposta.ok) throw new ErroApi((await resposta.json()) as Problema);
    const tokens = (await resposta.json()) as Tokens;
    const dono = lerToken(tokens.accessToken);
    if (dono.tipo !== 'TUTOR') {
      await postar('/auth/logout', undefined, tokens.accessToken).catch(() => undefined);
      throw new ErroApi({ codigo: 'SO_TUTOR', title: 'O app é dos tutores. Empresas usam o Jaguara Enterprise na web.' });
    }
    await guardar(tokens);
    return usuario!;
  },

  /** Troca o refresh token por tokens novos; chamadas simultâneas esperam a mesma renovação. */
  renovar(): Promise<boolean> {
    renovando ??= (async () => {
      const refreshToken = await armazenamento.ler();
      if (!refreshToken) return false;
      const resposta = await postar('/auth/renovacao', { refreshToken }).catch(() => null);
      if (!resposta?.ok) {
        await limpar();
        return false;
      }
      await guardar((await resposta.json()) as Tokens);
      return true;
    })().finally(() => {
      renovando = null;
    });
    return renovando;
  },

  async sair(): Promise<void> {
    if (accessToken) await postar('/auth/logout', undefined, accessToken).catch(() => undefined);
    await limpar();
  },
};
