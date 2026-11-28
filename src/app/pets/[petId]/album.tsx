import { getDocumentAsync } from 'expo-document-picker';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Tela, Texto } from '../../../componentes';
import { mensagemDaApi } from '../../../pets/erros';
import { cores, espaco } from '../../../tema/tokens';

type Foto = components['schemas']['FotoDoPet'];

const TAMANHO_MAXIMO = 8 * 1024 * 1024;
const dia = (iso: string) => iso.split('-').reverse().join('/');

/** Envia a imagem ao álbum: pede a URL à API e manda o arquivo direto ao armazenamento. */
export async function enviarAoAlbum(
  petId: string,
  arquivo: { uri: string; name: string; size?: number; mimeType?: string },
  legenda: string,
  http: typeof fetch = (...a) => fetch(...a),
): Promise<string | null> {
  if ((arquivo.size ?? 0) > TAMANHO_MAXIMO) return 'A foto passa de 8 MB.';
  const { data, error } = await api.POST('/pets/{petId}/album', {
    params: { path: { petId } },
    body: {
      nomeArquivo: arquivo.name,
      tamanhoBytes: Math.max(1, arquivo.size ?? 0),
      ...(legenda.trim() ? { legenda: legenda.trim() } : {}),
    },
  });
  if (error || !data) return mensagemDaApi(error);
  try {
    const conteudo = await (await http(arquivo.uri)).blob();
    const envio = await http(data.urlEnvio, {
      method: 'PUT',
      headers: arquivo.mimeType ? { 'Content-Type': arquivo.mimeType } : undefined,
      body: conteudo,
    });
    if (!envio.ok) throw new Error(String(envio.status));
    return null;
  } catch {
    await api.DELETE('/album/{fotoId}', { params: { path: { fotoId: data.id } } });
    return 'Não foi possível enviar a foto. Confira a conexão e tente de novo.';
  }
}

/** Álbum do pet: as fotos da família, que também entram na linha do tempo. */
export default function Album() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [fotos, setFotos] = useState<Foto[] | null>(null);
  const [legenda, setLegenda] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.GET('/pets/{petId}/album', { params: { path: { petId } } }).then(({ data }) => {
      if (ativo) setFotos(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  async function escolher() {
    const r = await getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setEnviando(true);
    setErro(null);
    const problema = await enviarAoAlbum(petId, { uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType }, legenda);
    setEnviando(false);
    if (problema) {
      setErro(problema);
      return;
    }
    setLegenda('');
    setVersao((v) => v + 1);
  }

  return (
    <Tela titulo="Álbum" subtitulo="As fotos que a família guarda. Elas aparecem também na linha do tempo.">
      {erro && <Alerta tipo="erro" titulo="Foto não enviada" mensagem={erro} />}
      <Campo rotulo="Legenda (opcional)" value={legenda} onChangeText={setLegenda} maxLength={200} />
      <Botao titulo="Adicionar foto" carregando={enviando} onPress={() => void escolher()} larguraTotal />
      {fotos === null ? (
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando o álbum" />
      ) : fotos.length === 0 ? (
        <Texto cor={cores.textoSecundario}>Nenhuma foto ainda. Que tal a primeira?</Texto>
      ) : (
        <View style={estilos.grade}>
          {fotos.map((f) => (
            <View key={f.id} style={estilos.celula}>
              <Image source={{ uri: f.url }} style={estilos.foto} contentFit="cover" accessibilityLabel={f.legenda ?? 'Foto do pet'} />
              <Texto variante="legenda" cor={cores.textoSecundario}>
                {dia(f.tiradaEm)} · {f.enviadaPor}
              </Texto>
              {f.legenda && <Texto variante="legenda">{f.legenda}</Texto>}
            </View>
          ))}
        </View>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, alignSelf: 'stretch' },
  celula: { width: '48%', flexGrow: 1, gap: espaco.xs },
  foto: { width: '100%', aspectRatio: 1, borderRadius: 12 },
});
