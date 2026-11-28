import { router } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, Share, View } from 'react-native';
import type { components } from '../api/esquema';
import { Botao, Texto } from '../componentes';
import { criarEstilos } from '../tema/estilos';
import { cores, espaco, raio } from '../tema/tokens';
import { FotoPet } from './FotoPet';

type Celebracao = NonNullable<components['schemas']['HojeTutor']['celebracoes']>[number];

const CANTO = require('../../assets/images/onca-canto.png');

const anos = (n: number) => `${n} ${n === 1 ? 'ano' : 'anos'}`;

/** Título e mensagem para compartilhar de cada comemoração. */
export function textoDaComemoracao(c: Celebracao) {
  if (c.tipo === 'ANIVERSARIO') {
    return {
      chamada: 'Hoje é dia de festa',
      destaque: `${c.petNome} faz ${anos(c.anos)}`,
      titulo: `Hoje é aniversário de ${c.petNome}!`,
      detalhe: `${c.petNome} faz ${anos(c.anos)} hoje.`,
      mensagem: `Hoje ${c.petNome} faz ${anos(c.anos)}! Parabéns pra essa companhia que deixa tudo melhor. #Jaguara`,
    };
  }
  return {
    chamada: 'Aniversário no Jaguara',
    destaque: `${anos(c.anos)} com ${c.petNome}`,
    titulo: `${anos(c.anos)} de ${c.petNome} no Jaguara`,
    detalhe: `Há ${anos(c.anos)} vocês cuidam de ${c.petNome} por aqui.`,
    mensagem: `Faz ${anos(c.anos)} que cuido de ${c.petNome} com o Jaguara: vacinas, rotina e tudo no mesmo lugar. #Jaguara`,
  };
}

interface Props {
  celebracoes: Celebracao[];
  /** Fotos dos pets, para o destaque mostrar quem faz aniversário. */
  fotos?: Record<string, string | null | undefined>;
}

/**
 * Destaque de aniversário na tela Hoje (identidade Selvagem): a foto do pet, um pedaço de
 * pelagem de onça no canto e os atalhos para compartilhar e para o álbum.
 */
export function Comemoracoes({ celebracoes, fotos = {} }: Props) {
  const [largura, setLargura] = useState(0);
  if (celebracoes.length === 0) return null;

  const cartao = (c: Celebracao) => {
    const t = textoDaComemoracao(c);
    return (
      <View key={`${c.petId}-${c.tipo}`} style={[estilos.cartao, celebracoes.length > 1 && { width: largura * 0.86 }]}>
        <Image source={CANTO} style={estilos.canto} accessibilityElementsHidden importantForAccessibility="no" />
        <View style={estilos.topo} accessible accessibilityLabel={`${t.titulo} ${t.detalhe}`}>
          <View style={estilos.foto}>
            <FotoPet petId={c.petId} nome={c.petNome} fotoUrl={fotos[c.petId] ?? undefined} tamanho={58} />
          </View>
          <View style={estilos.textos}>
            <Texto variante="legenda" negrito cor={cores.destaque}>
              {t.chamada}
            </Texto>
            <Texto variante="titulo2" style={estilos.destaque}>
              {t.destaque}
            </Texto>
          </View>
        </View>
        <View style={estilos.acoes}>
          <Botao titulo="Compartilhar" onPress={() => void Share.share({ message: t.mensagem })} />
          <Botao
            titulo="Ver o álbum"
            variante="secundaria"
            onPress={() => router.push({ pathname: '/pets/[petId]/album', params: { petId: c.petId } })}
          />
        </View>
      </View>
    );
  };

  if (celebracoes.length === 1) return cartao(celebracoes[0]);

  // Mais de uma festa no dia: os cartões passam de lado, para não empurrar o resto da tela.
  return (
    <View onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
      {largura > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={largura * 0.86 + espaco.md}
          decelerationRate="fast"
          contentContainerStyle={{ gap: espaco.md }}
          accessibilityLabel="Comemorações de hoje"
        >
          {celebracoes.map(cartao)}
        </ScrollView>
      )}
    </View>
  );
}

const estilos = criarEstilos(() => ({
  cartao: {
    backgroundColor: cores.destaqueFundo,
    borderWidth: 1,
    borderColor: cores.destaqueBorda,
    borderRadius: raio.cartao + 4,
    padding: espaco.lg,
    gap: espaco.md,
    overflow: 'hidden',
  },
  canto: { position: 'absolute', top: 0, right: 0, width: 110, height: 56 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.md, paddingRight: 56 },
  foto: { borderWidth: 3, borderColor: cores.primaria, borderRadius: 999 },
  textos: { flex: 1, gap: 2 },
  destaque: { fontSize: 22, lineHeight: 26 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, alignItems: 'center' },
}));
