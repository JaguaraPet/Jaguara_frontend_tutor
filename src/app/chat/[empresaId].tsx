import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Tela, Texto } from '../../componentes';
import { mensagemDaApi } from '../../pets/erros';
import { useUsuario } from '../../sessao/useUsuario';
import { cores, espaco, raio } from '../../tema/tokens';

type Mensagem = components['schemas']['Mensagem'];

/** De quanto em quanto tempo a conversa busca mensagens novas da empresa. */
export const ATUALIZAR_MS = 5000;

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; titulo: string; mensagem: string }
  | { tipo: 'pronto'; conversaId: string };

const emOrdem = (lista: Mensagem[]) =>
  [...lista].sort((a, b) => (a.dataHoraEnvio ?? '').localeCompare(b.dataHoraEnvio ?? ''));

const hora = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';

/**
 * Chat com a empresa (UC-43, CT-43-01): o tutor conversa com empresas em que é cliente ou tem
 * agendamento. Com a tela aberta, as respostas da empresa aparecem sozinhas.
 */
export default function ChatEmpresa() {
  const { empresaId, empresa } = useLocalSearchParams<{ empresaId: string; empresa?: string }>();
  const usuario = useUsuario();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const { data, error } = await api.POST('/conversas', { body: { tipo: 'EMPRESA', empresaId } });
      if (!ativo) return;
      if (error || !data?.id) {
        setEstado({ tipo: 'erro', titulo: 'Chat indisponível', mensagem: mensagemDaApi(error) });
        return;
      }
      setEstado({ tipo: 'pronto', conversaId: data.id });
    })();
    return () => {
      ativo = false;
    };
  }, [empresaId]);

  const conversaId = estado.tipo === 'pronto' ? estado.conversaId : null;

  useEffect(() => {
    if (!conversaId) return;
    let ativo = true;
    const buscar = () =>
      void api
        .GET('/conversas/{conversaId}/mensagens', { params: { path: { conversaId } } })
        .then(({ data }) => {
          if (ativo && data) setMensagens(emOrdem(data));
        });
    buscar();
    const id = setInterval(buscar, ATUALIZAR_MS);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [conversaId]);

  async function enviar() {
    if (!conversaId || !texto.trim()) return;
    setEnviando(true);
    setAviso(null);
    const { data, error } = await api.POST('/conversas/{conversaId}/mensagens', {
      params: { path: { conversaId } },
      body: { conteudo: texto.trim() },
    });
    setEnviando(false);
    if (error || !data) {
      setAviso(mensagemDaApi(error));
      return;
    }
    setTexto('');
    setMensagens((m) => [...m, data]);
  }

  const titulo = empresa ? `Chat com ${empresa}` : 'Chat';

  if (estado.tipo === 'carregando') {
    return (
      <Tela titulo={titulo}>
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Abrindo a conversa" />
      </Tela>
    );
  }
  if (estado.tipo === 'erro') {
    return (
      <Tela titulo={titulo}>
        <Alerta tipo="erro" titulo={estado.titulo} mensagem={estado.mensagem} />
        <Botao titulo="Voltar" variante="secundaria" onPress={() => router.back()} />
      </Tela>
    );
  }

  return (
    <Tela titulo={titulo} subtitulo="As respostas da empresa aparecem aqui.">
      {aviso && <Alerta tipo="erro" titulo="Mensagem não enviada" mensagem={aviso} />}
      <View style={estilos.conversa} accessibilityLiveRegion="polite">
        {mensagens.length === 0 && (
          <Texto cor={cores.textoSecundario}>Escreva sua dúvida sobre serviços, horários ou o atendimento do seu pet.</Texto>
        )}
        {mensagens.map((m) => {
          const minha = m.remetenteId === usuario?.id;
          return (
            <View key={m.id} style={[estilos.balao, minha ? estilos.minha : estilos.dela]}>
              <Texto variante="legenda" negrito cor={minha ? cores.branco : cores.textoSecundario}>
                {minha ? 'Você' : (empresa ?? 'Empresa')} · {hora(m.dataHoraEnvio)}
              </Texto>
              <Texto cor={minha ? cores.branco : cores.texto}>{m.conteudo}</Texto>
            </View>
          );
        })}
      </View>
      <Campo rotulo="Sua mensagem" value={texto} onChangeText={setTexto} multiline maxLength={4000} />
      <Botao
        titulo="Enviar"
        larguraTotal
        carregando={enviando}
        disabled={!texto.trim()}
        onPress={() => void enviar()}
      />
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  conversa: { gap: espaco.sm },
  balao: { padding: espaco.md, borderRadius: raio.padrao, gap: espaco.xs, maxWidth: '88%' },
  minha: { alignSelf: 'flex-end', backgroundColor: cores.primaria },
  dela: { alignSelf: 'flex-start', backgroundColor: cores.superficie },
});
