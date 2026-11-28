import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { criarEstilos } from '../tema/estilos';
import { cores, espaco } from '../tema/tokens';
import { FundoOnca } from './FundoOnca';
import { Icone } from './Icone';
import { Texto } from './Texto';

interface Props {
  titulo: string;
  subtitulo?: string;
  /** Linha pequena acima do título, como a data na tela inicial. */
  sobretitulo?: string;
  /** Algo ao lado do título, como o botão de notificações. */
  acessorio?: ReactNode;
  children?: ReactNode;
  /** Botão de voltar no topo. Por padrão aparece quando há uma tela anterior. */
  voltar?: boolean;
}

const podeVoltar = () => typeof router?.canGoBack === 'function' && router.canGoBack();

/** Estrutura padrão das telas: área segura, estampa de fundo, título e conteúdo com rolagem. */
export function Tela({ titulo, subtitulo, sobretitulo, acessorio, children, voltar = podeVoltar() }: Props) {
  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <FundoOnca />
      {/* O voltar fica parado no topo; só o conteúdo rola por baixo dele. */}
      {voltar && (
        <View style={estilos.barra}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [estilos.voltar, pressed && { backgroundColor: cores.superficie, transform: [{ scale: 0.94 }] }]}
          >
            <Icone nome="arrow-left" tamanho={22} cor={cores.texto} />
          </Pressable>
        </View>
      )}
      <ScrollView contentContainerStyle={[estilos.conteudo, voltar && estilos.conteudoComVoltar]}>
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
  conteudoComVoltar: { paddingTop: espaco.sm },
  barra: { paddingHorizontal: espaco.lg + 4, paddingTop: espaco.sm, paddingBottom: espaco.xs },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  titulos: { flex: 1, gap: 2 },
  voltar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cores.cartaoBorda,
    backgroundColor: cores.elevado,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
