import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao, Texto } from '../componentes';
import { cores, espaco } from '../tema/tokens';

export default function Inicio() {
  return (
    <SafeAreaView style={estilos.tela}>
      <View style={estilos.conteudo}>
        <Texto variante="titulo1" cor={cores.primariaEscura}>
          Jaguara
        </Texto>
        <Texto cor={cores.textoSecundario} style={estilos.centro}>
          Saúde, rotina e cuidados do seu pet em um só lugar.
        </Texto>
        {__DEV__ && (
          <Botao
            variante="texto"
            titulo="Ver componentes (desenvolvimento)"
            onPress={() => router.push('/componentes')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaco.xl,
    gap: espaco.sm,
  },
  centro: { textAlign: 'center' },
});
