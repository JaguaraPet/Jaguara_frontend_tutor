import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Alerta, Botao, Campo, Tela, Texto } from '../componentes';
import { useUsuario } from '../sessao/useUsuario';
import { cores, espaco, raio } from '../tema/tokens';
import { criarEstilos } from '../tema/estilos';

type Mensagem = components['schemas']['Mensagem'];

/** Intervalo e limite da espera pela resposta do assistente. */
export const ESPERA_MS = 1500;
export const TENTATIVAS = 20;

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'sem-plano' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; conversaId: string };

/** Mensagens em ordem de envio (a API devolve da mais nova para a mais antiga). */
const emOrdem = (lista: Mensagem[]) =>
  [...lista].sort((a, b) => (a.dataHoraEnvio ?? '').localeCompare(b.dataHoraEnvio ?? ''));

/**
 * Assistente virtual (UC-43): só com o PANTERA ativo (RN25). A resposta chega alguns segundos
 * depois; a tela busca de novo até ela aparecer.
 */
export default function Assistente() {
  const usuario = useUsuario();
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' });
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [aguardando, setAguardando] = useState(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    void (async () => {
      const { data, error, response } = await api.POST('/conversas', {
        body: { tipo: 'ASSISTENTE_VIRTUAL' },
      });
      if (!montado.current) return;
      if (response.status === 402) return setEstado({ tipo: 'sem-plano' });
      if (error || !data?.id) return setEstado({ tipo: 'erro', mensagem: 'Não deu para abrir o assistente agora.' });
      const historico = await api.GET('/conversas/{conversaId}/mensagens', {
        params: { path: { conversaId: data.id } },
      });
      if (!montado.current) return;
      setMensagens(emOrdem(historico.data ?? []));
      setEstado({ tipo: 'pronto', conversaId: data.id });
    })();
    return () => {
      montado.current = false;
    };
  }, []);

  async function enviar() {
    if (estado.tipo !== 'pronto' || !texto.trim()) return;
    const conteudo = texto.trim();
    setTexto('');
    setAguardando(true);
    const caminho = { params: { path: { conversaId: estado.conversaId } } };
    const enviada = await api.POST('/conversas/{conversaId}/mensagens', { ...caminho, body: { conteudo } });
    if (enviada.response.status === 429) {
      setAguardando(false);
      setEstado({ tipo: 'erro', mensagem: 'Você chegou ao limite de mensagens de hoje. Volte amanhã.' });
      return;
    }
    if (enviada.data) setMensagens((m) => [...m, enviada.data!]);
    for (let i = 0; i < TENTATIVAS && montado.current; i++) {
      await new Promise((r) => setTimeout(r, ESPERA_MS));
      const lista = emOrdem((await api.GET('/conversas/{conversaId}/mensagens', caminho)).data ?? []);
      const ultima = lista[lista.length - 1];
      if (ultima && ultima.remetenteId === null) {
        if (montado.current) setMensagens(lista);
        break;
      }
    }
    if (montado.current) setAguardando(false);
  }

  if (estado.tipo === 'carregando') {
    return (
      <Tela titulo="Assistente virtual">
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Abrindo o assistente" />
      </Tela>
    );
  }
  if (estado.tipo === 'sem-plano') {
    return (
      <Tela titulo="Assistente virtual">
        <Alerta
          tipo="info"
          titulo="Recurso do plano PANTERA"
          mensagem="O assistente responde dúvidas do dia a dia do seu pet. Assine o PANTERA para conversar."
        />
        <Botao titulo="Tornar-se membro" larguraTotal onPress={() => router.push('/pantera')} />
      </Tela>
    );
  }
  if (estado.tipo === 'erro') {
    return (
      <Tela titulo="Assistente virtual">
        <Alerta tipo="erro" titulo="Assistente indisponível" mensagem={estado.mensagem} />
      </Tela>
    );
  }

  return (
    <Tela titulo="Assistente virtual" subtitulo="Orienta, mas não substitui o veterinário.">
      <View style={estilos.conversa} accessibilityLiveRegion="polite">
        {mensagens.map((m) => {
          const minha = m.remetenteId === usuario?.id;
          return (
            <View key={m.id} style={[estilos.balao, minha ? estilos.minha : estilos.dele]}>
              <Texto variante="legenda" negrito cor={minha ? cores.sobrePrimaria : cores.textoSecundario}>
                {minha ? 'Você' : 'Assistente'}
              </Texto>
              <Texto cor={minha ? cores.sobrePrimaria : cores.texto}>{m.conteudo}</Texto>
            </View>
          );
        })}
        {aguardando && (
          <Texto variante="legenda" cor={cores.textoSecundario}>
            O assistente está respondendo…
          </Texto>
        )}
      </View>
      <Campo
        rotulo="Sua pergunta"
        value={texto}
        onChangeText={setTexto}
        multiline
        maxLength={4000}
        placeholder="Ex.: quantos passeios por dia são ideais?"
      />
      <Botao titulo="Enviar" larguraTotal disabled={aguardando || !texto.trim()} onPress={() => void enviar()} />
    </Tela>
  );
}

const estilos = criarEstilos(() => ({
  conversa: { gap: espaco.sm },
  balao: { padding: espaco.md, borderRadius: raio.padrao, gap: espaco.xs, maxWidth: '88%' },
  minha: { alignSelf: 'flex-end', backgroundColor: cores.primaria },
  dele: { alignSelf: 'flex-start', backgroundColor: cores.superficie },
}));
