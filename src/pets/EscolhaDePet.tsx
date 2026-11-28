import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Botao, Icone, Texto } from '../componentes';
import { criarEstilos } from '../tema/estilos';
import { cores, espaco } from '../tema/tokens';
import { FotoPet } from './FotoPet';

interface PetEscolhivel {
  id: string;
  nome: string;
  especie?: string;
  fotoUrl?: string | null;
}

interface Props {
  pets: PetEscolhivel[];
  /** '' quer dizer todos os pets. */
  petId: string;
  aoMudar: (petId: string) => void;
}

/** Até este número de pets, as opções cabem lado a lado como pílulas. */
const MAXIMO_EM_PILULAS = 3;

/**
 * Filtro de pet do Hoje. Com poucos pets, pílulas em ordem alfabética (nenhum parece
 * "preferido"); com mais, um botão que abre uma janela com a lista e as fotos.
 */
export function EscolhaDePet({ pets, petId, aoMudar }: Props) {
  const [aberta, setAberta] = useState(false);
  const ordenados = [...pets].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const escolhido = ordenados.find((p) => p.id === petId);

  if (ordenados.length <= MAXIMO_EM_PILULAS) {
    return (
      <View style={estilos.pilulas} accessibilityRole="radiogroup" accessibilityLabel="Pet">
        {[{ id: '', nome: 'Todos' } as PetEscolhivel, ...ordenados].map((p) => {
          const ativo = petId === p.id;
          return (
            <Pressable
              key={p.id || 'todos'}
              accessibilityRole="radio"
              accessibilityLabel={p.nome}
              accessibilityState={{ checked: ativo }}
              onPress={() => aoMudar(p.id)}
              style={({ pressed }) => [
                estilos.chip,
                p.id !== '' && estilos.chipComFoto,
                ativo && estilos.chipAtivo,
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
            >
              {p.id !== '' && <FotoPet petId={p.id} nome={p.nome} fotoUrl={p.fotoUrl ?? undefined} tamanho={34} />}
              <Texto style={[estilos.chipTexto, ativo && { color: cores.sobrePrimaria }]}>{p.nome}</Texto>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Pet: ${escolhido?.nome ?? 'todos'}. Trocar`}
        onPress={() => setAberta(true)}
        style={({ pressed }) => [estilos.chip, estilos.seletor, escolhido && estilos.chipComFoto, pressed && { transform: [{ scale: 0.98 }] }]}
      >
        {escolhido && (
          <FotoPet petId={escolhido.id} nome={escolhido.nome} fotoUrl={escolhido.fotoUrl ?? undefined} tamanho={34} />
        )}
        <Texto style={estilos.chipTexto}>{escolhido ? escolhido.nome : `Todos os pets (${ordenados.length})`}</Texto>
        <Icone nome="chevron-down" tamanho={20} cor={cores.textoSecundario} />
      </Pressable>

      <Modal visible={aberta} transparent animationType="fade" onRequestClose={() => setAberta(false)}>
        <Pressable style={estilos.fundo} onPress={() => setAberta(false)} accessibilityLabel="Fechar a escolha de pet">
          <Pressable style={estilos.janela} onPress={() => undefined}>
            <Texto variante="titulo2">Ver o dia de qual pet?</Texto>
            <ScrollView style={estilos.lista} contentContainerStyle={{ gap: espaco.xs }}>
              {[{ id: '', nome: 'Todos os pets' } as PetEscolhivel, ...ordenados].map((p) => {
                const ativo = petId === p.id;
                return (
                  <Pressable
                    key={p.id || 'todos'}
                    accessibilityRole="radio"
                    accessibilityLabel={p.nome}
                    accessibilityState={{ checked: ativo }}
                    onPress={() => {
                      aoMudar(p.id);
                      setAberta(false);
                    }}
                    style={({ pressed }) => [estilos.opcao, ativo && estilos.opcaoAtiva, pressed && { backgroundColor: cores.superficie }]}
                  >
                    {p.id ? (
                      <FotoPet petId={p.id} nome={p.nome} fotoUrl={p.fotoUrl ?? undefined} tamanho={40} />
                    ) : (
                      <View style={estilos.todos}>
                        <Icone nome="paw" tamanho={20} cor={cores.secundaria} />
                      </View>
                    )}
                    <Texto negrito style={{ flex: 1 }}>
                      {p.nome}
                    </Texto>
                    {ativo && <Icone nome="check" tamanho={20} cor={cores.secundaria} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Botao titulo="Fechar" variante="texto" onPress={() => setAberta(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const estilos = criarEstilos(() => ({
  pilulas: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  chip: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.sm,
    paddingHorizontal: espaco.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.cartaoBorda,
    backgroundColor: cores.cartao,
  },
  chipComFoto: { paddingLeft: 4 },
  chipAtivo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  chipTexto: { fontWeight: '600' },
  seletor: { alignSelf: 'flex-start' },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: espaco.lg },
  janela: {
    maxHeight: '80%',
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: 20,
    backgroundColor: cores.elevado,
    borderWidth: 1,
    borderColor: cores.cartaoBorda,
  },
  lista: { flexGrow: 0 },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    minHeight: 56,
    paddingHorizontal: espaco.sm,
    borderRadius: 12,
  },
  opcaoAtiva: { backgroundColor: cores.superficie },
  todos: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.superficie,
  },
}));
