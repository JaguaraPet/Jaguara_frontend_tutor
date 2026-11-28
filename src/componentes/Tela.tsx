import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { criarEstilos } from '../tema/estilos';
import { cores, espaco } from '../tema/tokens';
import { FundoOnca } from './FundoOnca';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Linha pequena acima do título, como a data na tela inicial. */
  sobretitulo?: string;
  /** Algo ao lado do título, como o botão de notificações. */
  acessorio?: ReactNode;
  children?: ReactNode;
}

/** Estrutura padrão das telas: área segura, estampa de fundo, título e conteúdo com rolagem. */
export function Tela({ titulo, subtitulo, sobretitulo, acessorio, children }: Props) {
  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <FundoOnca />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <View style={estilos.titulos}>
            {sobretitulo && (
              <Texto variante="legenda" cor={cores.textoSecundario}>
                {sobretitulo}
              </Texto>
            )}
            <Texto variante="titulo1">{titulo}</Texto>
            {subtitulo && <Texto cor={cores.textoSecundario}>{subtitulo}</Texto>}
          </View>
          {acessorio}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = criarEstilos(() => ({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.xl, paddingHorizontal: espaco.lg + 4, gap: espaco.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  titulos: { flex: 1, gap: 2 },
}));
