import { StyleSheet } from 'react-native';
import { versaoDoTema } from './tokens';

/**
 * StyleSheet que acompanha o modo claro ou escuro. Os estilos são montados na primeira leitura
 * e de novo sempre que o modo muda, então podem usar `cores` à vontade:
 *
 *   const estilos = criarEstilos(() => ({ tela: { backgroundColor: cores.fundo } }));
 */
type Estilos = Parameters<typeof StyleSheet.create>[0];

export function criarEstilos<S extends Estilos>(fabrica: () => S & Estilos): Readonly<S> {
  let feitaNa = -1;
  let atual = {} as Readonly<S>;
  return new Proxy({} as Readonly<S>, {
    get(_alvo, chave) {
      if (feitaNa !== versaoDoTema()) {
        atual = StyleSheet.create(fabrica());
        feitaNa = versaoDoTema();
      }
      return atual[chave as keyof S];
    },
  });
}
