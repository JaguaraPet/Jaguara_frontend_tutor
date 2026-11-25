import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Cartao, Tela, Texto } from '../../componentes';
import { podePagar, quandoSolicitacao, rotuloStatus, rotuloStatusSimples } from '../../agendamento/acompanhamento';
import { mensagemDaApi } from '../../pets/erros';
import { cores, espaco } from '../../tema/tokens';

type Detalhe = components['schemas']['DetalheSolicitacao'];

const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

/** Detalhe da solicitação (UC-42): status, histórico, pagamento e cancelamento (RN38). */
export default function DetalheDaSolicitacao() {
  const { solicitacaoId } = useLocalSearchParams<{ solicitacaoId: string }>();
  const [s, setS] = useState<Detalhe | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api
      .GET('/solicitacoes/{solicitacaoId}', { params: { path: { solicitacaoId } } })
      .then(({ data, error }) => {
        if (!ativo) return;
        setErro(error ? mensagemDaApi(error) : null);
        setS(data ?? null);
      });
    return () => {
      ativo = false;
    };
  }, [solicitacaoId, versao]);

  async function cancelar() {
    setCancelando(true);
    const { error } = await api.POST('/solicitacoes/{solicitacaoId}/cancelamento', {
      params: { path: { solicitacaoId } },
    });
    setCancelando(false);
    setConfirmando(false);
    setAviso(
      error
        ? { tipo: 'erro', titulo: 'Solicitação não cancelada', mensagem: mensagemDaApi(error) }
        : { tipo: 'sucesso', titulo: 'Solicitação cancelada', mensagem: 'A empresa foi avisada.' },
    );
    setVersao((v) => v + 1);
  }

  if (erro) {
    return (
      <Tela titulo="Solicitação">
        <Alerta tipo="erro" titulo="Solicitação indisponível" mensagem={erro} />
        <Botao titulo="Voltar" variante="secundaria" onPress={() => router.back()} />
      </Tela>
    );
  }
  if (!s) {
    return (
      <Tela titulo="Solicitação">
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando a solicitação" />
      </Tela>
    );
  }

  const aceita = s.status === 'ACEITA';

  return (
    <Tela titulo={s.servico.nome} subtitulo={`${s.empresa.nome} · ${s.pet.nome}`}>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      <Cartao titulo={rotuloStatus(s)} subtitulo={`${aceita ? 'Horário confirmado' : 'Horário pedido'}: ${quandoSolicitacao(s)}`}>
        {s.agendamento && <Texto>Valor contratado: {reais(s.agendamento.precoContratado)}</Texto>}
        {s.motivoRecusa && <Texto>Motivo da recusa: {s.motivoRecusa}</Texto>}
        {s.observacoes && <Texto variante="legenda">Suas observações: {s.observacoes}</Texto>}
      </Cartao>

      {podePagar(s) && s.agendamento && (
        <Botao
          titulo="Pagar"
          larguraTotal
          onPress={() =>
            router.push({
              pathname: '/pagar/[agendamentoId]',
              params: { agendamentoId: s.agendamento!.id, servico: s.servico.nome, valor: String(s.agendamento!.precoContratado) },
            })
          }
        />
      )}

      {s.podeCancelar && !confirmando && (
        <Botao titulo="Cancelar solicitação" variante="secundaria" larguraTotal onPress={() => setConfirmando(true)} />
      )}
      {confirmando && (
        <>
          <Alerta
            tipo="alerta"
            titulo="Cancelar esta solicitação?"
            mensagem={aceita ? 'O agendamento será desfeito e o horário volta a ficar livre.' : 'A empresa deixa de analisar o pedido.'}
          />
          <View style={estilos.acoes}>
            <Botao titulo="Confirmar cancelamento" variante="perigo" carregando={cancelando} onPress={() => void cancelar()} />
            <Botao titulo="Manter" variante="texto" onPress={() => setConfirmando(false)} />
          </View>
        </>
      )}
      {!s.podeCancelar && s.motivoSemCancelamento && (s.status === 'PENDENTE' || aceita) && (
        <Texto variante="legenda" cor={cores.textoSecundario}>
          {s.motivoSemCancelamento}
        </Texto>
      )}

      <Texto variante="titulo2">Histórico</Texto>
      {s.historico.map((h, i) => (
        <View key={`${h.dataHora}-${i}`} style={estilos.historico} accessible>
          <Texto variante="legenda" cor={cores.textoSecundario}>
            {dataHora(h.dataHora)} · {h.autor}
          </Texto>
          <Texto>{rotuloStatusSimples(h.statusNovo)}</Texto>
          {h.descricao ? <Texto variante="legenda">{h.descricao}</Texto> : null}
        </View>
      ))}
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row', gap: espaco.sm },
  historico: { gap: espaco.xs, paddingBottom: espaco.sm, borderBottomWidth: 1, borderBottomColor: cores.borda, alignSelf: 'stretch' },
});
