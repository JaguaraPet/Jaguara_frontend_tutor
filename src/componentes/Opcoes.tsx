import { Pressable, View } from 'react-native';
import { alvoToqueMinimo, cores, espaco, raio } from '../tema/tokens';
import { criarEstilos } from '../tema/estilos';
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
            <Texto negrito={escolhida} cor={escolhida ? cores.sobrePrimaria : cores.texto}>
              {o.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = criarEstilos(() => ({
  grupo: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: {
    minHeight: alvoToqueMinimo,
    justifyContent: 'center',
    paddingHorizontal: espaco.md,
    borderWidth: 1,
    borderColor: cores.textoSecundario,
    borderRadius: raio.pilula,
    backgroundColor: cores.elevado,
  },
  escolhida: { backgroundColor: cores.primaria, borderColor: cores.primaria },
}));
