import { useSyncExternalStore } from 'react';
import { sessao } from './sessao';

/** Usuário logado; atualiza a tela quando a sessão muda. */
export function useUsuario() {
  return useSyncExternalStore(
    (ouvinte) => sessao.ouvir(ouvinte),
    () => sessao.usuario,
  );
}
