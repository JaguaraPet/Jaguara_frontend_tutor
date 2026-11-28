import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform, useColorScheme } from 'react-native';
import type { Modo } from './paletas';

/** O tutor escolhe na tela Perfil: seguir o celular (padrão), claro ou escuro. */
export type PreferenciaTema = 'sistema' | Modo;

const CHAVE = 'jaguara.tema';
const VALIDAS: PreferenciaTema[] = ['sistema', 'claro', 'escuro'];

let atual: PreferenciaTema = 'sistema';
const ouvintes = new Set<() => void>();

const guardar = {
  ler: async (): Promise<string | null> =>
    Platform.OS === 'web' ? (globalThis.localStorage?.getItem(CHAVE) ?? null) : SecureStore.getItemAsync(CHAVE),
  gravar: async (valor: string) => {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(CHAVE, valor);
    else await SecureStore.setItemAsync(CHAVE, valor);
  },
};

/** Lê a escolha guardada. Chamado uma vez, na abertura do app. */
export async function carregarPreferenciaTema(): Promise<void> {
  const salva = await guardar.ler().catch(() => null);
  if (salva && VALIDAS.includes(salva as PreferenciaTema)) mudar(salva as PreferenciaTema);
}

function mudar(p: PreferenciaTema) {
  atual = p;
  ouvintes.forEach((o) => o());
}

export async function escolherTema(p: PreferenciaTema): Promise<void> {
  mudar(p);
  await guardar.gravar(p).catch(() => null);
}

export function usePreferenciaTema(): PreferenciaTema {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    () => atual,
  );
}

/** O modo que vale agora: a escolha do tutor ou, em "sistema", o modo do celular. */
export function useModoTema(): Modo {
  const preferencia = usePreferenciaTema();
  const sistema = useColorScheme();
  if (preferencia !== 'sistema') return preferencia;
  return sistema === 'dark' ? 'escuro' : 'claro';
}
