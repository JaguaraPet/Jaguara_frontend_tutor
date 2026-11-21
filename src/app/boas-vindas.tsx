import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Botao, Texto } from '../componentes';
import { useUsuario } from '../sessao/useUsuario';
import { cores, espaco } from '../tema/tokens';

/** Boas-vindas (UX-01, seção 3): entrar ou criar a conta. */
export default function BoasVindas() {
  const usuario = useUsuario();
  if (usuario) return <Redirect href="/" />;
  return (
    <SafeAreaView style={estilos.tela}>
      <View style={estilos.topo}>
        <Texto variante="titulo1" cor={cores.primariaEscura}>
          Jaguara
        </Texto>
        <Texto cor={cores.textoSecundario} style={estilos.centro}>
          Saúde, rotina e cuidados do seu pet em um só lugar.
        </Texto>
      </View>
      <View style={estilos.acoes}>
        <Botao titulo="Entrar" larguraTotal onPress={() => router.push('/entrar')} />
        <Botao titulo="Criar conta" variante="secundaria" larguraTotal onPress={() => router.push('/cadastro')} />
        {__DEV__ && (
          <Botao titulo="Ver componentes (desenvolvimento)" variante="texto" onPress={() => router.push('/componentes')} />
        )}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, padding: espaco.xl, justifyContent: 'space-between' },
  topo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaco.sm },
  centro: { textAlign: 'center' },
  acoes: { gap: espaco.md },
});
