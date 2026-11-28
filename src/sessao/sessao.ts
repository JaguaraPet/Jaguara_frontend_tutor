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

/**
 * No navegador (versão web do app, para iPhone e demonstração) não há Keychain: o refresh token
 * fica no localStorage, como na web Enterprise, para a sessão sobreviver a recarregar a página.
 */
const web = {
  ler: (): Promise<string | null> => {
    try {
      return Promise.resolve(globalThis.localStorage?.getItem(CHAVE_REFRESH) ?? null);
    } catch {
      return Promise.resolve(null);
    }
  },
  gravar: (valor: string): Promise<void> => {
    try {
      globalThis.localStorage?.setItem(CHAVE_REFRESH, valor);
    } catch {
      // navegação privada: a sessão vale só enquanto a página estiver aberta
    }
    return Promise.resolve();
  },
  apagar: (): Promise<void> => {
    try {
      globalThis.localStorage?.removeItem(CHAVE_REFRESH);
    } catch {
      // ignora
    }
    return Promise.resolve();
  },
};

const armazenamento = {
  ler: () => (Platform.OS === 'web' ? web.ler() : SecureStore.getItemAsync(CHAVE_REFRESH)),
  gravar: (valor: string) =>
    Platform.OS === 'web' ? web.gravar(valor) : SecureStore.setItemAsync(CHAVE_REFRESH, valor),
  apagar: () => (Platform.OS === 'web' ? web.apagar() : SecureStore.deleteItemAsync(CHAVE_REFRESH)),
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

/** Resposta do login social (UC-02 FA04): entrou, falta a senha da conta ou falta o cadastro. */
export type ResultadoSocial =
  | { tipo: 'entrou' }
  | { tipo: 'senha'; mensagem: string }
  | { tipo: 'cadastro'; cadastroToken: string; nome?: string; email: string };

export interface PedidoSocial {
  provedor: 'GOOGLE' | 'APPLE';
  idToken: string;
  nonce: string;
  senha?: string;
}

/** Só tutores usam o app: tokens de outra conta são devolvidos e a sessão não abre. */
async function aceitarTokensDeTutor(tokens: Tokens) {
  if (lerToken(tokens.accessToken).tipo !== 'TUTOR') {
    await postar('/auth/logout', undefined, tokens.accessToken).catch(() => undefined);
    throw new ErroApi({ codigo: 'SO_TUTOR', title: 'O app é dos tutores. Empresas usam o Jaguara Enterprise na web.' });
  }
  await guardar(tokens);
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
    await aceitarTokensDeTutor((await resposta.json()) as Tokens);
    return usuario!;
  },

  /** Entra como a tutora de uma demonstração, pelo código do "Ver como tutor" da Enterprise. */
  async entrarNaDemonstracao(codigo: string): Promise<Usuario> {
    const resposta = await postar('/demonstracao/tutor', { codigo });
    if (!resposta.ok) throw new ErroApi((await resposta.json()) as Problema);
    await aceitarTokensDeTutor((await resposta.json()) as Tokens);
    return usuario!;
  },

  /** UC-02 FA04: entra com o id_token do Google ou da Apple. */
  async entrarSocial(pedido: PedidoSocial): Promise<ResultadoSocial> {
    const resposta = await postar('/auth/login/social', pedido);
    if (resposta.status === 428) {
      const pendente = (await resposta.json()) as { cadastroToken: string; nome?: string; email: string };
      return { tipo: 'cadastro', ...pendente };
    }
    if (resposta.status === 409) {
      const problema = (await resposta.json()) as Problema;
      return { tipo: 'senha', mensagem: problema.detail ?? problema.title ?? 'Confirme a senha da sua conta.' };
    }
    if (!resposta.ok) throw new ErroApi((await resposta.json()) as Problema);
    await aceitarTokensDeTutor((await resposta.json()) as Tokens);
    return { tipo: 'entrou' };
  },

  /** UC-01 com RF46: conclui o cadastro iniciado pelo Google ou pela Apple e já entra. */
  async concluirCadastroSocial(dados: {
    cadastroToken: string;
    nome: string;
    cpf: string;
    telefone?: string;
    aceiteTermos: true;
  }): Promise<void> {
    const resposta = await postar('/auth/cadastro/social', dados);
    if (!resposta.ok) throw new ErroApi((await resposta.json()) as Problema);
    await aceitarTokensDeTutor((await resposta.json()) as Tokens);
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
