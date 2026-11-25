import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Alerta, Botao, Campo, Cartao, Opcoes, Tela, Texto } from '../componentes';
import { mensagemDaApi } from '../pets/erros';
import { cores, espaco } from '../tema/tokens';

type Pagamento = components['schemas']['PagamentoDetalhado'];
type Filtro = 'TODOS' | 'ACEITO' | 'PENDENTE' | 'RECUSADO';

const STATUS: Record<string, string> = {
  ACEITO: 'Pago',
  PENDENTE: 'Aguardando',
  RECUSADO: 'Recusado',
  CANCELADO: 'Cancelado',
};
const REEMBOLSO: Record<string, string> = {
  EM_ANALISE: 'Reembolso em análise',
  APROVADO: 'Reembolso aprovado',
  NEGADO: 'Reembolso negado',
};
const METODO: Record<string, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
  BOLETO: 'Boleto',
};
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'ACEITO', rotulo: 'Pagos' },
  { valor: 'PENDENTE', rotulo: 'Aguardando' },
  { valor: 'RECUSADO', rotulo: 'Recusados' },
];

const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const data = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

/** Meus pagamentos (UC-45): histórico com filtro e pedido de reembolso (RN39). */
export default function Pagamentos() {
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [lista, setLista] = useState<Pagamento[] | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api
      .GET('/pagamentos', { params: { query: filtro === 'TODOS' ? {} : { status: filtro } } })
      .then(({ data: pagamentos }) => {
        if (ativo) setLista(pagamentos ?? []);
      });
    return () => {
      ativo = false;
    };
  }, [filtro, versao]);

  async function reembolsar(p: Pagamento) {
    if (motivo.trim().length < 10) {
      setAviso({ tipo: 'erro', titulo: 'Conte o motivo em pelo menos 10 caracteres.' });
      return;
    }
    setEnviando(true);
    const { error } = await api.POST('/pagamentos/{pagamentoId}/reembolsos', {
      params: { path: { pagamentoId: p.id } },
      body: { motivo: motivo.trim() },
    });
    setEnviando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Reembolso não solicitado', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: 'Reembolso solicitado', mensagem: `${p.contraparte} vai analisar o pedido.` });
    setAberto(null);
    setMotivo('');
    setVersao((v) => v + 1);
  }

  return (
    <Tela titulo="Pagamentos" subtitulo="Serviços e assinatura pagos pelo app.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      <Opcoes<Filtro>
        rotulo="Mostrar"
        opcoes={FILTROS}
        valor={filtro}
        aoMudar={(f) => {
          setFiltro(f);
          setLista(null);
        }}
      />
      {lista === null ? (
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando os pagamentos" />
      ) : lista.length === 0 ? (
        <>
          <Texto cor={cores.textoSecundario}>Nenhum pagamento encontrado para o filtro selecionado.</Texto>
          {filtro !== 'TODOS' && <Botao titulo="Limpar filtro" variante="texto" onPress={() => setFiltro('TODOS')} />}
        </>
      ) : (
        lista.map((p) => (
          <Cartao
            key={p.id}
            titulo={`${p.descricao}${p.pet ? ` · ${p.pet}` : ''}`}
            subtitulo={`${p.contraparte} · ${data(p.dataHora)}`}
          >
            <View style={estilos.linha}>
              <Texto negrito>{reais(p.valor)}</Texto>
              <Texto cor={p.status === 'ACEITO' ? cores.sucesso : p.status === 'RECUSADO' ? cores.erro : cores.alerta}>
                {STATUS[p.status] ?? p.status}
              </Texto>
            </View>
            <Texto variante="legenda" cor={cores.textoSecundario}>
              {METODO[p.metodo] ?? p.metodo} · transação {p.codigoTransacao}
            </Texto>
            {p.reembolso && <Texto variante="legenda">{REEMBOLSO[p.reembolso.status ?? ''] ?? p.reembolso.status}</Texto>}
            {p.podeReembolsar && aberto !== p.id && (
              <Botao titulo="Pedir reembolso" variante="texto" accessibilityLabel={`Pedir reembolso de ${p.descricao}`} onPress={() => setAberto(p.id)} />
            )}
            {aberto === p.id && (
              <>
                <Campo rotulo="Motivo do reembolso" value={motivo} onChangeText={setMotivo} multiline maxLength={1000} />
                <View style={estilos.acoes}>
                  <Botao titulo="Enviar pedido" carregando={enviando} onPress={() => void reembolsar(p)} />
                  <Botao titulo="Cancelar" variante="texto" onPress={() => setAberto(null)} />
                </View>
              </>
            )}
          </Cartao>
        ))
      )}
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  acoes: { flexDirection: 'row', gap: espaco.sm },
});
