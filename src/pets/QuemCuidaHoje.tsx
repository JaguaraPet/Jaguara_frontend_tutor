import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Botao, Cartao, Texto } from '../componentes';
import { cores, coresSuaves, espaco } from '../tema/tokens';

type PetDoDia = components['schemas']['HojeTutor']['pets'][number];
type Sugestao = NonNullable<components['schemas']['HojeTutor']['sugestoes']>[number];

/**
 * "Quem cuida hoje": quando a família divide o pet, um toque define quem fica com o dia. Só
 * aparece com mais de um responsável.
 */
export function QuemCuidaHoje({ pet, aoMudar }: { pet: PetDoDia; aoMudar: () => void }) {
  const [trocando, setTrocando] = useState(false);
  const responsaveis = pet.responsaveis ?? [];
  if (responsaveis.length < 2) return null;
  const atual = pet.cuidadorHoje;

  async function definir(tutorId?: string) {
    await api.PUT('/pets/{petId}/cuidador-hoje', {
      params: { path: { petId: pet.id } },
      body: tutorId ? { tutorId } : {},
    });
    setTrocando(false);
    aoMudar();
  }

  return (
    <View style={estilos.faixa}>
      <Texto variante="legenda" negrito>
        {atual ? (atual.souEu ? 'Você cuida hoje' : `${atual.nome} cuida hoje`) : 'Ninguém ficou com o dia ainda'}
      </Texto>
      {!atual?.souEu && <Botao titulo="Eu cuido hoje" variante="texto" onPress={() => void definir()} />}
      <Botao titulo={trocando ? 'Fechar' : 'Passar o dia'} variante="texto" onPress={() => setTrocando((v) => !v)} />
      {trocando && (
        <View style={estilos.opcoes} accessibilityRole="radiogroup" accessibilityLabel="Quem cuida hoje">
          {responsaveis.map((r) => (
            <Pressable
              key={r.tutorId}
              accessibilityRole="radio"
              accessibilityState={{ checked: atual?.tutorId === r.tutorId }}
              onPress={() => void definir(r.tutorId)}
              style={[estilos.opcao, atual?.tutorId === r.tutorId && estilos.ativa]}
            >
              <Texto cor={atual?.tutorId === r.tutorId ? cores.branco : cores.texto}>{r.nome}</Texto>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/** "Faz 2 meses do último banho": atalho para agendar de novo o mesmo serviço. */
export function LembretesDeServico({ sugestoes }: { sugestoes: Sugestao[] }) {
  if (sugestoes.length === 0) return null;
  return (
    <Cartao titulo="Vale lembrar">
      {sugestoes.map((s) => (
        <View key={`${s.petId}-${s.servicoId}`} style={estilos.sugestao}>
          <Texto>{s.texto}</Texto>
          <Botao
            titulo="Agendar de novo"
            variante="secundaria"
            onPress={() =>
              router.push({
                pathname: '/solicitar/[servicoId]',
                params: { servicoId: s.servicoId, petId: s.petId, servico: s.servicoNome, empresa: s.empresaNome },
              })
            }
          />
        </View>
      ))}
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  faixa: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: espaco.sm,
    backgroundColor: coresSuaves.info,
    borderRadius: 12,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs,
  },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, width: '100%' },
  opcao: {
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.borda,
    minHeight: 44,
    justifyContent: 'center',
  },
  ativa: { backgroundColor: cores.secundaria, borderColor: cores.secundaria },
  sugestao: { gap: espaco.sm, paddingVertical: espaco.xs },
});
