import { View } from 'react-native';
import { criarEstilos } from '../tema/estilos';
import { cores, espaco } from '../tema/tokens';
import { Botao } from './Botao';
import { Texto } from './Texto';

/** Barra de progresso de um formulário em etapas, com "Etapa 1 de 2" e o título da atual. */
export function ProgressoEtapas({ titulos, atual }: { titulos: readonly string[]; atual: number }) {
  return (
    <View style={estilos.progresso}>
      <View
        style={estilos.barras}
        accessibilityRole="progressbar"
        accessibilityLabel={`Etapa ${atual + 1} de ${titulos.length}`}
        accessibilityValue={{ min: 1, max: titulos.length, now: atual + 1 }}
      >
        {titulos.map((t, i) => (
          <View key={t} style={[estilos.barra, i <= atual && estilos.barraFeita]} />
        ))}
      </View>
      <Texto variante="legenda" cor={cores.textoSecundario}>
        Etapa {atual + 1} de {titulos.length}
      </Texto>
      <Texto negrito>{titulos[atual]}</Texto>
    </View>
  );
}

/** Voltar e Continuar; na última etapa, o botão de concluir no lugar do Continuar. */
export function BotoesEtapas({
  atual,
  total,
  aoVoltar,
  aoContinuar,
  tituloFinal,
  aoConcluir,
  carregando = false,
}: {
  atual: number;
  total: number;
  aoVoltar: () => void;
  aoContinuar: () => void;
  tituloFinal: string;
  aoConcluir: () => void;
  carregando?: boolean;
}) {
  const ultima = atual === total - 1;
  return (
    <View style={estilos.botoes}>
      {ultima ? (
        <Botao titulo={tituloFinal} larguraTotal carregando={carregando} onPress={aoConcluir} />
      ) : (
        <Botao titulo="Continuar" icone="chevron-right" larguraTotal onPress={aoContinuar} />
      )}
      {atual > 0 && <Botao titulo="Voltar" icone="arrow-left" variante="texto" onPress={aoVoltar} />}
    </View>
  );
}

const estilos = criarEstilos(() => ({
  progresso: { gap: espaco.xs },
  barras: { flexDirection: 'row', gap: espaco.xs },
  barra: { flex: 1, height: 6, borderRadius: 3, backgroundColor: cores.borda },
  barraFeita: { backgroundColor: cores.primaria },
  botoes: { gap: espaco.sm },
}));
