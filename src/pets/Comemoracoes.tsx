import { router } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import type { components } from '../api/esquema';
import { Botao, Texto } from '../componentes';
import { coresSuaves, espaco } from '../tema/tokens';

type Celebracao = NonNullable<components['schemas']['HojeTutor']['celebracoes']>[number];

const anos = (n: number) => `${n} ${n === 1 ? 'ano' : 'anos'}`;

/** Título e mensagem para compartilhar de cada comemoração. */
export function textoDaComemoracao(c: Celebracao) {
  if (c.tipo === 'ANIVERSARIO') {
    return {
      titulo: `Hoje é aniversário de ${c.petNome}! 🎂`,
      detalhe: `${c.petNome} faz ${anos(c.anos)} hoje.`,
      mensagem: `Hoje ${c.petNome} faz ${anos(c.anos)}! 🐾🎂 Parabéns pra essa companhia que deixa tudo melhor. #Jaguara`,
    };
  }
  return {
    titulo: `${anos(c.anos)} de ${c.petNome} no Jaguara 🎉`,
    detalhe: `Há ${anos(c.anos)} vocês cuidam de ${c.petNome} por aqui.`,
    mensagem: `Faz ${anos(c.anos)} que cuido de ${c.petNome} com o Jaguara: vacinas, rotina e tudo no mesmo lugar. 🐾 #Jaguara`,
  };
}

/** Cartões de aniversário na tela Hoje, com o atalho para compartilhar e para o álbum. */
export function Comemoracoes({ celebracoes }: { celebracoes: Celebracao[] }) {
  if (celebracoes.length === 0) return null;
  return (
    <>
      {celebracoes.map((c) => {
        const t = textoDaComemoracao(c);
        return (
          <View key={`${c.petId}-${c.tipo}`} style={estilos.cartao} accessible accessibilityLabel={`${t.titulo} ${t.detalhe}`}>
            <Texto variante="titulo2">{t.titulo}</Texto>
            <Texto>{t.detalhe}</Texto>
            <View style={estilos.acoes}>
              <Botao titulo="Compartilhar" onPress={() => void Share.share({ message: t.mensagem })} />
              <Botao
                titulo="Ver o álbum"
                variante="texto"
                onPress={() => router.push({ pathname: '/pets/[petId]/album', params: { petId: c.petId } })}
              />
            </View>
          </View>
        );
      })}
    </>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: coresSuaves.alerta, borderRadius: 16, padding: espaco.lg, gap: espaco.sm },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, alignItems: 'center' },
});
