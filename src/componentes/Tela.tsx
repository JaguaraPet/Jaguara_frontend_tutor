import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cores, espaco } from '../tema/tokens';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  subtitulo?: string;
  children?: ReactNode;
}

/** Estrutura padrão das telas: área segura, título e conteúdo com rolagem. */
export function Tela({ titulo, subtitulo, children }: Props) {
  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <Texto variante="titulo1">{titulo}</Texto>
          {subtitulo && <Texto cor={cores.textoSecundario}>{subtitulo}</Texto>}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.xl, gap: espaco.lg },
  cabecalho: { gap: espaco.xs },
});
