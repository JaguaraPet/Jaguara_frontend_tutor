import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Share, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Tela, Texto } from '../../../componentes';
import { mensagemDaApi } from '../../../pets/erros';
import { cores, coresSuaves, espaco } from '../../../tema/tokens';
import { criarEstilos } from '../../../tema/estilos';

type Aviso = components['schemas']['AvisoPetPerdido'];

/**
 * Meu pet se perdeu: a família avisa onde ele foi visto e um telefone, e ganha a página pública
 * com o cartaz e o QR Code para compartilhar no WhatsApp e imprimir.
 */
export default function PetPerdido() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [local, setLocal] = useState('');
  const [telefone, setTelefone] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void api.GET('/pets/{petId}/perdido', { params: { path: { petId } } }).then(({ data }) => {
      if (!ativo || !data) return;
      setAviso(data);
      setLocal(data.local ?? '');
      setTelefone(data.telefone ?? '');
      setMensagem(data.mensagem ?? '');
    });
    return () => {
      ativo = false;
    };
  }, [petId]);

  async function avisar() {
    setEnviando(true);
    setErro(null);
    const { data, error } = await api.POST('/pets/{petId}/perdido', {
      params: { path: { petId } },
      body: { local, telefone, ...(mensagem.trim() ? { mensagem } : {}) },
    });
    setEnviando(false);
    if (error || !data) {
      setErro(mensagemDaApi(error));
      return;
    }
    setAviso(data);
  }

  async function encontrado() {
    await api.DELETE('/pets/{petId}/perdido', { params: { path: { petId } } });
    setAviso({ perdido: false });
  }

  if (!aviso) {
    return (
      <Tela titulo="Pet perdido">
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando" />
      </Tela>
    );
  }

  if (aviso.perdido && aviso.url) {
    const url = aviso.url;
    return (
      <Tela titulo="Aviso ativo" subtitulo="Compartilhe a página e cole o cartaz pelo bairro.">
        <View style={estilos.destaque}>
          <Texto negrito>Visto pela última vez: {aviso.local}</Texto>
          <Texto>Contato: {aviso.telefone}</Texto>
          <Texto variante="legenda" cor={cores.textoSecundario}>
            {url}
          </Texto>
        </View>
        <Botao
          titulo="Compartilhar no WhatsApp e redes"
          larguraTotal
          onPress={() => void Share.share({ message: `Me ajude a encontrar meu pet! ${url}` })}
        />
        <Botao titulo="Abrir o cartaz para imprimir" variante="secundaria" larguraTotal onPress={() => void Linking.openURL(url)} />
        <Botao titulo="Atualizar os dados do aviso" variante="texto" onPress={() => setAviso({ ...aviso, perdido: false, url: undefined })} />
        <Botao titulo="Encontrei meu pet" icone="heart-outline" variante="secundaria" larguraTotal onPress={() => void encontrado()} />
      </Tela>
    );
  }

  return (
    <Tela titulo="Meu pet se perdeu" subtitulo="Crie o aviso com a foto do pet, para compartilhar e imprimir.">
      {erro && <Alerta tipo="erro" titulo="Aviso não criado" mensagem={erro} />}
      <Campo rotulo="Onde foi visto pela última vez" value={local} onChangeText={setLocal} maxLength={200} placeholder="Ex.: Praça da Sé, perto do metrô" />
      <Campo rotulo="Telefone para contato" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" maxLength={20} />
      <Campo
        rotulo="Como reconhecer (opcional)"
        value={mensagem}
        onChangeText={setMensagem}
        maxLength={500}
        multiline
        placeholder="Ex.: usa coleira azul, tem medo de moto"
      />
      <Texto variante="legenda" cor={cores.textoSecundario}>
        A página mostra a foto do perfil do pet, o local e o telefone. Ela sai do ar quando você tocar em “Encontrei!”.
      </Texto>
      <Botao titulo="Criar o aviso" carregando={enviando} larguraTotal onPress={() => void avisar()} />
    </Tela>
  );
}

const estilos = criarEstilos(() => ({
  destaque: { backgroundColor: coresSuaves.erro, borderRadius: 12, padding: espaco.md, gap: espaco.xs },
}));
