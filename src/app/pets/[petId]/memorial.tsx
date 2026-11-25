import { getDocumentAsync } from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Opcoes, Tela, Texto } from '../../../componentes';
import { mensagemDaApi } from '../../../pets/erros';
import { cores, espaco, raio } from '../../../tema/tokens';

type Memorial = components['schemas']['Memorial'];
type TipoTexto = 'TEXTO' | 'HOMENAGEM';
type Aviso = { tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string };

/** Envia a foto direto ao armazenamento; se falhar, a lembrança é desfeita. */
async function enviarFoto(petId: string, foto: { uri: string; name: string; size?: number }): Promise<string | null> {
  const { data, error } = await api.POST('/pets/{petId}/memorial/itens', {
    params: { path: { petId } },
    body: { tipo: 'FOTO', nomeArquivo: foto.name, tamanhoBytes: foto.size ?? 1 },
  });
  if (error || !data?.urlEnvio) return mensagemDaApi(error);
  try {
    const conteudo = await (await fetch(foto.uri)).blob();
    const envio = await fetch(data.urlEnvio, { method: 'PUT', body: conteudo });
    if (!envio.ok) throw new Error(String(envio.status));
    return null;
  } catch {
    await api.DELETE('/memorial/itens/{itemId}', { params: { path: { itemId: data.itemId } } });
    return 'Não foi possível enviar a foto. Tente de novo.';
  }
}

/** Memorial do pet (UC-15, RN19): só depois do falecimento registrado. */
export default function MemorialDoPet() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [status, setStatus] = useState<string | null>(null);
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<TipoTexto>('TEXTO');
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.GET('/pets/{petId}', { params: { path: { petId } } }).then(async ({ data }) => {
      if (!ativo || !data) return;
      setStatus(data.status ?? 'ATIVO');
      if (data.status === 'FALECIDO') {
        const m = await api.GET('/pets/{petId}/memorial', { params: { path: { petId } } });
        if (!ativo || !m.data) return;
        setMemorial(m.data);
        setMensagem((atual) => atual || m.data?.mensagem || '');
      }
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  async function registrarFalecimento() {
    setOcupado(true);
    const { error } = await api.POST('/pets/{petId}/falecimento', { params: { path: { petId } } });
    setOcupado(false);
    setConfirmando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Falecimento não registrado', mensagem: mensagemDaApi(error) });
      return;
    }
    setVersao((v) => v + 1);
  }

  async function salvarMensagem() {
    setOcupado(true);
    const { error } = await api.PUT('/pets/{petId}/memorial', {
      params: { path: { petId } },
      body: { mensagem: mensagem.trim(), publico: false },
    });
    setOcupado(false);
    setAviso(error ? { tipo: 'erro', titulo: 'Mensagem não salva', mensagem: mensagemDaApi(error) } : { tipo: 'sucesso', titulo: 'Mensagem salva' });
  }

  async function adicionarTexto() {
    if (texto.trim().length < 2) return;
    setOcupado(true);
    const { error } = await api.POST('/pets/{petId}/memorial/itens', {
      params: { path: { petId } },
      body: { tipo, conteudo: texto.trim() },
    });
    setOcupado(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Lembrança não salva', mensagem: mensagemDaApi(error) });
      return;
    }
    setTexto('');
    setVersao((v) => v + 1);
  }

  async function adicionarFoto() {
    const r = await getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets[0]) return;
    setOcupado(true);
    const problema = await enviarFoto(petId, r.assets[0]);
    setOcupado(false);
    if (problema) {
      setAviso({ tipo: 'erro', titulo: 'Foto não enviada', mensagem: problema });
      return;
    }
    setVersao((v) => v + 1);
  }

  if (status === null) {
    return (
      <Tela titulo="Memorial">
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando" />
      </Tela>
    );
  }

  if (status !== 'FALECIDO') {
    return (
      <Tela titulo="Memorial" subtitulo="Um espaço para guardar as lembranças do pet.">
        {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
        <Alerta
          tipo="info"
          titulo="O memorial abre depois do falecimento registrado"
          mensagem="Ao registrar, os remédios em uso terminam e os lembretes do pet param."
        />
        {!confirmando ? (
          <Botao titulo="Registrar falecimento" variante="secundaria" larguraTotal onPress={() => setConfirmando(true)} />
        ) : (
          <View style={estilos.acoes}>
            <Botao titulo="Confirmar" variante="perigo" carregando={ocupado} onPress={() => void registrarFalecimento()} />
            <Botao titulo="Cancelar" variante="texto" onPress={() => setConfirmando(false)} />
          </View>
        )}
        <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
      </Tela>
    );
  }

  return (
    <Tela titulo={`Em memória de ${memorial?.nome ?? ''}`.trim()}>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      <Cartao titulo="Mensagem">
        <Campo rotulo="Mensagem do memorial" value={mensagem} onChangeText={setMensagem} multiline maxLength={2000} />
        <Botao titulo="Salvar mensagem" variante="secundaria" carregando={ocupado} onPress={() => void salvarMensagem()} />
      </Cartao>

      <Cartao titulo="Nova lembrança">
        <Opcoes<TipoTexto>
          rotulo="Tipo"
          opcoes={[
            { valor: 'TEXTO', rotulo: 'Lembrança' },
            { valor: 'HOMENAGEM', rotulo: 'Homenagem' },
          ]}
          valor={tipo}
          aoMudar={setTipo}
        />
        <Campo rotulo="Texto" value={texto} onChangeText={setTexto} multiline maxLength={2000} />
        <View style={estilos.acoes}>
          <Botao titulo="Adicionar texto" disabled={texto.trim().length < 2} onPress={() => void adicionarTexto()} />
          <Botao titulo="Adicionar foto" variante="secundaria" onPress={() => void adicionarFoto()} />
        </View>
      </Cartao>

      {(memorial?.itens ?? []).map((i) => (
        <View key={i.id} style={estilos.item}>
          {i.tipo === 'FOTO' && i.urlFoto ? (
            <Image source={{ uri: i.urlFoto }} style={estilos.foto} accessibilityLabel={`Foto de ${memorial?.nome}`} />
          ) : (
            <>
              <Texto variante="legenda" negrito cor={cores.textoSecundario}>
                {i.tipo === 'HOMENAGEM' ? 'Homenagem' : 'Lembrança'}
              </Texto>
              <Texto>{i.conteudo}</Texto>
            </>
          )}
        </View>
      ))}
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  item: { gap: espaco.xs, padding: espaco.md, borderRadius: raio.padrao, backgroundColor: cores.superficie, alignSelf: 'stretch' },
  foto: { width: '100%', aspectRatio: 4 / 3, borderRadius: raio.padrao },
});
