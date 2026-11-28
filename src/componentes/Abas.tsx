import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { cores, espaco, raio } from '../tema/tokens';
import { criarEstilos } from '../tema/estilos';
import { Texto } from './Texto';

export type Aba<Chave extends string> = {
  chave: Chave;
  rotulo: string;
  contador?: number;
};

type Props<Chave extends string> = {
  abas: readonly Aba<Chave>[];
  ativa: Chave;
  aoMudar: (chave: Chave) => void;
  rotulo: string;
};

/**
 * Abas em pílula: dividem uma tela longa em partes, para o tutor não precisar rolar tanto.
 * Rolam na horizontal quando não cabem na largura.
 */
export function Abas<Chave extends string>({ abas, ativa, aoMudar, rotulo }: Props<Chave>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={estilos.linha}
      accessibilityRole="tablist"
      accessibilityLabel={rotulo}
    >
      {abas.map((a) => {
        const selecionada = a.chave === ativa;
        return (
          <Pressable
            key={a.chave}
            accessibilityRole="tab"
            accessibilityState={{ selected: selecionada }}
            accessibilityLabel={a.contador ? `${a.rotulo}, ${a.contador}` : a.rotulo}
            onPress={() => aoMudar(a.chave)}
            style={({ pressed }) => [
              estilos.aba,
              selecionada && estilos.abaAtiva,
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
          >
            <Texto negrito cor={selecionada ? cores.sobrePrimaria : cores.texto}>
              {a.rotulo}
            </Texto>
            {!!a.contador && (
              <View style={[estilos.contador, selecionada && estilos.contadorAtivo]}>
                <Texto variante="legenda" negrito cor={selecionada ? cores.primaria : cores.sobrePrimaria}>
                  {a.contador}
                </Texto>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Conteúdo que aparece com um leve deslize ao trocar de aba. */
export function PainelDaAba({ chave, children }: { chave: string; children: ReactNode }) {
  const [entrada] = useState(() => new Animated.Value(0));
  useEffect(() => {
    entrada.setValue(0);
    Animated.timing(entrada, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [chave, entrada]);
  return (
    <Animated.View
      style={{
        gap: espaco.lg,
        opacity: entrada,
        transform: [
          {
            translateY: entrada.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

const estilos = criarEstilos(() => ({
  linha: { gap: espaco.sm, paddingVertical: 2 },
  aba: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    borderRadius: raio.pilula,
    borderWidth: 1,
    borderColor: cores.cartaoBorda,
    backgroundColor: cores.elevado,
  },
  abaAtiva: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  contador: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.destaque,
  },
  contadorAtivo: { backgroundColor: cores.sobrePrimaria },
}));
