import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Botao, Campo, Cartao, Icone, Texto } from '../componentes';
import { alvoToqueMinimo, cores, espaco } from '../tema/tokens';

type Pendente = components['schemas']['AvaliacaoPendente'];

const ROTULOS = ['Ruim', 'Fraco', 'Ok', 'Bom', 'Excelente'];

/** Cinco estrelas tocáveis, anunciadas como opções de 1 a 5. */
export function SeletorNota({ nota, aoEscolher }: { nota: number; aoEscolher: (n: number) => void }) {
  return (
    <View style={estilos.estrelas} accessibilityRole="radiogroup" accessibilityLabel="Nota">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityLabel={`${n} de 5, ${ROTULOS[n - 1]}`}
          accessibilityState={{ checked: nota === n }}
          onPress={() => aoEscolher(n)}
          hitSlop={4}
          style={estilos.estrela}
        >
          <Icone nome={n <= nota ? 'star' : 'star-outline'} tamanho={32} cor={n <= nota ? cores.destaque : cores.textoSecundario} />
        </Pressable>
      ))}
    </View>
  );
}

function Avaliar({ item, aoAvaliar }: { item: Pendente; aoAvaliar: () => void }) {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  async function enviar() {
    setEnviando(true);
    const { error } = await api.POST('/agendamentos/{agendamentoId}/avaliacao', {
      params: { path: { agendamentoId: item.agendamentoId } },
      body: { nota, comentario: comentario.trim() || undefined },
    });
    setEnviando(false);
    if (!error) setEnviada(true);
  }

  const agendarDeNovo = () =>
    router.push({ pathname: '/solicitar/[servicoId]', params: { servicoId: item.servicoId, petId: item.petId } });

  if (enviada) {
    return (
      <Cartao titulo="Obrigado pela avaliação!" subtitulo={`Ela ajuda outros tutores a escolher a ${item.empresa}.`}>
        <View style={estilos.acoes}>
          <Botao titulo="Agendar de novo" variante="secundaria" onPress={agendarDeNovo} />
          <Botao titulo="Fechar" variante="texto" onPress={aoAvaliar} />
        </View>
      </Cartao>
    );
  }

  return (
    <Cartao titulo={`Como foi o ${item.servico.toLowerCase()} de ${item.pet}?`} subtitulo={item.empresa}>
      {item.procedimentos && (
        <Texto variante="legenda" cor={cores.textoSecundario}>
          O que foi feito: {item.procedimentos}
        </Texto>
      )}
      <SeletorNota nota={nota} aoEscolher={setNota} />
      {nota > 0 && (
        <>
          <Campo
            rotulo="Quer contar mais? (opcional)"
            value={comentario}
            onChangeText={setComentario}
            maxLength={1000}
            multiline
          />
          <Botao titulo="Enviar avaliação" carregando={enviando} onPress={() => void enviar()} />
        </>
      )}
      <Botao titulo="Agendar de novo" variante="texto" onPress={agendarDeNovo} />
    </Cartao>
  );
}

/**
 * Depois do atendimento: o resumo do que a empresa fez, a nota de 1 a 5 e o atalho para
 * agendar de novo. Some quando não há atendimento esperando avaliação.
 */
export function AvaliarAtendimentos({ versao }: { versao: number }) {
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.GET('/tutor/avaliacoes/pendentes').then(({ data }) => {
      if (ativo && data) setPendentes(data);
    });
    return () => {
      ativo = false;
    };
  }, [versao, recarga]);

  if (pendentes.length === 0) return null;
  return (
    <>
      {pendentes.slice(0, 2).map((p) => (
        <Avaliar key={p.agendamentoId} item={p} aoAvaliar={() => setRecarga((v) => v + 1)} />
      ))}
    </>
  );
}

const estilos = StyleSheet.create({
  estrelas: { flexDirection: 'row', gap: espaco.xs, marginVertical: espaco.sm },
  estrela: { minWidth: alvoToqueMinimo, minHeight: alvoToqueMinimo, alignItems: 'center', justifyContent: 'center' },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
});
