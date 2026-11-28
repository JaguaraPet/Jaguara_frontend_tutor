import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { TIPOS_EVENTO, horaDe, porDia, rotuloDoDia } from '../../agenda/agenda';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Cartao, Icone, Opcoes, Tela, Texto } from '../../componentes';
import { cores, espaco } from '../../tema/tokens';

type Pet = components['schemas']['Pet'];
type Evento = components['schemas']['Evento'];

const rotuloTipo = (t: string) => TIPOS_EVENTO.find((x) => x.valor === t)?.rotulo ?? t;

/** Aba Agenda (UC-10): compromissos dos próximos 30 dias, eventos do tutor e agendamentos com empresas. */
export default function Agenda() {
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petId, setPetId] = useState('');
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [excluindo, setExcluindo] = useState<Evento | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    void api.GET('/pets').then(({ data }) => {
      const ativos = (data?.itens ?? []).filter((p) => p.status === 'ATIVO');
      setPets(ativos);
      setPetId((atual) => atual || ativos[0]?.id || '');
    });
  }, []);

  // Volta da tela de novo evento: busca de novo.
  useFocusEffect(useCallback(() => setVersao((v) => v + 1), []));

  useEffect(() => {
    if (!petId) return;
    let ativo = true;
    void api.GET('/pets/{petId}/eventos', { params: { path: { petId } } }).then(({ data }) => {
      if (ativo) setEventos(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  async function confirmar(e: Evento) {
    if (!e.id) return;
    const { error } = await api.POST('/agendamentos/{agendamentoId}/confirmacao', {
      params: { path: { agendamentoId: e.id } },
    });
    setAviso(error ? 'Não foi possível confirmar agora. Tente de novo.' : null);
    setVersao((v) => v + 1);
  }

  async function excluir() {
    if (!excluindo?.id) return;
    const { error } = await api.DELETE('/eventos/{eventoId}', { params: { path: { eventoId: excluindo.id } } });
    setExcluindo(null);
    setAviso(error ? 'Não foi possível excluir o evento.' : null);
    setVersao((v) => v + 1);
  }

  if (pets === null) {
    return (
      <Tela titulo="Agenda">
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando a agenda" />
      </Tela>
    );
  }
  if (pets.length === 0) {
    return (
      <Tela titulo="Agenda" subtitulo="Seus eventos, lembretes e agendamentos aparecem aqui.">
        <Alerta tipo="info" titulo="Cadastre um pet primeiro" mensagem="A agenda é organizada por pet." />
        <Botao titulo="Cadastrar pet" larguraTotal onPress={() => router.push('/pets/novo')} />
      </Tela>
    );
  }

  const grupos = porDia(eventos ?? []);

  return (
    <Tela titulo="Agenda" subtitulo="Próximos 30 dias.">
      {pets.length > 1 && (
        <Opcoes
          rotulo="Pet"
          opcoes={pets.map((p) => ({ valor: p.id!, rotulo: p.nome }))}
          valor={petId}
          aoMudar={(id) => {
            setPetId(id);
            setEventos(null);
          }}
        />
      )}
      <Botao
        titulo="Novo evento"
        larguraTotal
        onPress={() => router.push({ pathname: '/eventos/novo', params: { petId } })}
      />
      <Botao titulo="Google Agenda" variante="secundaria" larguraTotal onPress={() => router.push('/calendario')} />
      {aviso && <Alerta tipo="erro" titulo={aviso} />}
      {excluindo && (
        <Alerta
          tipo="alerta"
          titulo={`Excluir "${excluindo.titulo}"?`}
          mensagem="O lembrete deste evento também é cancelado."
        />
      )}
      {excluindo && (
        <View style={estilos.acoes}>
          <Botao titulo="Excluir" variante="perigo" onPress={() => void excluir()} />
          <Botao titulo="Manter" variante="texto" onPress={() => setExcluindo(null)} />
        </View>
      )}

      {eventos === null ? (
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando os eventos" />
      ) : grupos.length === 0 ? (
        <Texto cor={cores.textoSecundario}>Nada marcado nos próximos 30 dias.</Texto>
      ) : (
        grupos.map((g) => (
          <View key={g.dia} style={estilos.dia}>
            <Texto variante="titulo2" accessibilityRole="header">
              {rotuloDoDia(g.dia)}
            </Texto>
            {g.eventos.map((e) => (
              <Cartao
                key={`${e.origem}-${e.id}`}
                titulo={`${horaDe(e.dataHoraInicio)} · ${e.titulo}`}
                subtitulo={[rotuloTipo(e.tipo), e.origem === 'AGENDAMENTO' ? e.local ?? 'Agendamento com empresa' : e.local]
                  .filter(Boolean)
                  .join(' · ')}
              >
                {e.descricao ? <Texto>{e.descricao}</Texto> : null}
                {e.origem === 'AGENDAMENTO' && new Date(e.dataHoraInicio) > new Date() &&
                  (e.confirmado ? (
                    <View style={estilos.confirmada}>
                      <Icone nome="check-circle" tamanho={18} cor={cores.sucesso} />
                      <Texto cor={cores.sucesso}>Presença confirmada</Texto>
                    </View>
                  ) : (
                    <Botao
                      titulo="Confirmar presença"
                      variante="secundaria"
                      accessibilityLabel={`Confirmar presença em ${e.titulo}`}
                      onPress={() => void confirmar(e)}
                    />
                  ))}
                {e.origem === 'MANUAL' && (
                  <Botao
                    titulo="Excluir"
                    variante="texto"
                    accessibilityLabel={`Excluir ${e.titulo}`}
                    onPress={() => setExcluindo(e)}
                  />
                )}
              </Cartao>
            ))}
          </View>
        ))
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  dia: { gap: espaco.sm, alignSelf: 'stretch' },
  acoes: { flexDirection: 'row', gap: espaco.sm },
  confirmada: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
});
