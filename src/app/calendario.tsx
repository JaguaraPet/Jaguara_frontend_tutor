import { router, useLocalSearchParams } from 'expo-router';
import { openAuthSessionAsync } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { avisoDoRetorno, RETORNO } from '../agenda/calendario';
import type { Aviso } from '../agenda/calendario';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Alerta, Botao, Cartao, Opcoes, Tela, Texto } from '../componentes';
import { mensagemDaApi } from '../pets/erros';
import { cores, espaco } from '../tema/tokens';

type Pet = components['schemas']['Pet'];
type Situacao = { provedor?: string; conta?: string; autorizado?: boolean; ultimaSincronizacao?: string } | null;
const dataHora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

/** Google Agenda (UC-09): conectar, importar os compromissos dos próximos 30 dias e desconectar. */
export default function Calendario() {
  const { resultado } = useLocalSearchParams<{ resultado?: string }>();
  const [situacao, setSituacao] = useState<Situacao | undefined>(undefined);
  const [pets, setPets] = useState<Pet[]>([]);
  const [petId, setPetId] = useState('');
  const [aviso, setAviso] = useState<Aviso | null>(() => avisoDoRetorno(resultado));
  const [ocupado, setOcupado] = useState(false);
  const [desconectar, setDesconectar] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void Promise.all([api.GET('/calendario-externo'), api.GET('/pets', { params: { query: { status: 'ATIVO' } } })]).then(
      ([s, p]) => {
        if (!ativo) return;
        setSituacao((s.data as Situacao) ?? null);
        const lista = p.data?.itens ?? [];
        setPets(lista);
        setPetId((atual) => atual || lista[0]?.id || '');
      },
    );
    return () => {
      ativo = false;
    };
  }, [versao]);

  async function conectar() {
    setOcupado(true);
    const { data, error } = await api.POST('/calendario-externo/google/autorizacao');
    if (error || !data) {
      setOcupado(false);
      setAviso({ tipo: 'erro', titulo: 'Não foi possível abrir o Google', mensagem: mensagemDaApi(error) });
      return;
    }
    const sessao = await openAuthSessionAsync(data.url, RETORNO);
    setOcupado(false);
    if (sessao.type === 'success') {
      setAviso(avisoDoRetorno(new URL(sessao.url).searchParams.get('resultado') ?? undefined));
    }
    setVersao((v) => v + 1);
  }

  async function sincronizar() {
    if (!petId) return;
    setOcupado(true);
    const { data, error } = await api.POST('/pets/{petId}/calendario-externo/sincronizacao', {
      params: { path: { petId } },
    });
    setOcupado(false);
    if (error || !data) {
      setAviso({ tipo: 'erro', titulo: 'Sincronização não concluída', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({
      tipo: 'sucesso',
      titulo: 'Agenda sincronizada',
      mensagem: `${data.importados} novos, ${data.atualizados} atualizados e ${data.removidos} removidos. Eles aparecem na aba Agenda.`,
    });
    setVersao((v) => v + 1);
  }

  async function confirmarDesconexao() {
    const { error } = await api.DELETE('/calendario-externo');
    setDesconectar(false);
    setAviso(
      error
        ? { tipo: 'erro', titulo: 'Não foi possível desconectar', mensagem: mensagemDaApi(error) }
        : { tipo: 'info', titulo: 'Google Agenda desconectado', mensagem: 'Os compromissos importados saíram da agenda.' },
    );
    setVersao((v) => v + 1);
  }

  return (
    <Tela titulo="Google Agenda" subtitulo="Traga para a agenda do pet os compromissos dos próximos 30 dias.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {situacao === undefined ? (
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando a conexão" />
      ) : !situacao?.autorizado ? (
        <Cartao titulo="Não conectado" subtitulo="O Jaguara só lê a sua agenda; nada é alterado no Google.">
          <Botao titulo="Conectar Google Agenda" larguraTotal carregando={ocupado} onPress={() => void conectar()} />
        </Cartao>
      ) : (
        <Cartao
          titulo={situacao.conta ? `Conectado: ${situacao.conta}` : 'Conectado'}
          subtitulo={
            situacao.ultimaSincronizacao ? `Última sincronização em ${dataHora(situacao.ultimaSincronizacao)}` : 'Ainda não sincronizado'
          }
        >
          {pets.length > 1 && (
            <Opcoes rotulo="Pet" opcoes={pets.map((p) => ({ valor: p.id!, rotulo: p.nome }))} valor={petId} aoMudar={setPetId} />
          )}
          {pets.length === 0 ? (
            <Texto cor={cores.textoSecundario}>Cadastre um pet para sincronizar a agenda dele.</Texto>
          ) : (
            <Botao titulo="Sincronizar agora" larguraTotal carregando={ocupado} onPress={() => void sincronizar()} />
          )}
          {desconectar ? (
            <View style={estilos.acoes}>
              <Botao titulo="Confirmar desconexão" variante="perigo" onPress={() => void confirmarDesconexao()} />
              <Botao titulo="Manter" variante="texto" onPress={() => setDesconectar(false)} />
            </View>
          ) : (
            <Botao titulo="Desconectar" variante="texto" onPress={() => setDesconectar(true)} />
          )}
        </Cartao>
      )}
      <Botao titulo="Voltar para a agenda" variante="texto" onPress={() => router.replace('/agenda')} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
});
