import { Pressable, StyleSheet, View } from 'react-native';
import { alvoToqueMinimo, cores, espaco, raio } from '../tema/tokens';
import { Texto } from './Texto';

interface Props<T extends string> {
  rotulo: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T | '';
  aoMudar: (valor: T) => void;
}

/** Escolha única em botões (pet, tipo, dia), anunciada como grupo de opções (WCAG 4.1.2). */
export function Opcoes<T extends string>({ rotulo, opcoes, valor, aoMudar }: Props<T>) {
  return (
    <View style={estilos.grupo} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      {opcoes.map((o) => {
        const escolhida = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="radio"
            accessibilityLabel={o.rotulo}
            accessibilityState={{ checked: escolhida }}
            onPress={() => aoMudar(o.valor)}
            style={[estilos.opcao, escolhida && estilos.escolhida]}
          >
            <Texto negrito={escolhida} cor={escolhida ? cores.branco : cores.texto}>
              {o.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: {
    minHeight: alvoToqueMinimo,
    justifyContent: 'center',
    paddingHorizontal: espaco.md,
    borderWidth: 1,
    borderColor: cores.textoSecundario,
    borderRadius: raio.padrao,
    backgroundColor: cores.fundo,
  },
  escolhida: { backgroundColor: cores.primaria, borderColor: cores.primaria },
});
