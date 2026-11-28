import { getDocumentAsync } from 'expo-document-picker';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { api } from '../api/cliente';
import { Icone, Texto } from '../componentes';
import { cores, coresSuaves, espaco } from '../tema/tokens';
import { criarEstilos } from '../tema/estilos';
import { mensagemDaApi } from './erros';

const TAMANHO_MAXIMO = 8 * 1024 * 1024;

/** A primeira letra do nome, para o pet sem foto. */
export function inicial(nome: string): string {
  return (nome.trim()[0] ?? '?').toLocaleUpperCase('pt-BR');
}

/** Escolhe a imagem no aparelho e envia direto ao armazenamento. Devolve o erro, ou null. */
export async function enviarFotoPet(
  petId: string,
  arquivo: { uri: string; name: string; size?: number; mimeType?: string },
  http: typeof fetch = (...a) => fetch(...a),
): Promise<string | null> {
  const tamanho = arquivo.size ?? 0;
  if (tamanho > TAMANHO_MAXIMO) return 'A foto passa de 8 MB.';
  const { data, error } = await api.POST('/pets/{petId}/foto', {
    params: { path: { petId } },
    body: { nomeArquivo: arquivo.name, tamanhoBytes: Math.max(1, tamanho) },
  });
  if (error || !data) return mensagemDaApi(error);
  try {
    const conteudo = await (await http(arquivo.uri)).blob();
    const envio = await http(data.urlEnvio, {
      method: 'PUT',
      headers: arquivo.mimeType ? { 'Content-Type': arquivo.mimeType } : undefined,
      body: conteudo,
    });
    if (!envio.ok) throw new Error(`armazenamento respondeu ${envio.status}`);
    return null;
  } catch {
    await api.DELETE('/pets/{petId}/foto', { params: { path: { petId } } });
    return 'Não foi possível enviar a foto. Confira a conexão e tente de novo.';
  }
}

interface Props {
  petId: string;
  nome: string;
  especie?: string;
  fotoUrl?: string;
  tamanho?: number;
  /** Com esta função, tocar na foto troca a imagem; ela recebe o erro, ou null quando deu certo. */
  aoTrocar?: (erro: string | null) => void;
}

/** Foto redonda do pet; sem foto, a inicial do nome. */
export function FotoPet({ petId, nome, especie, fotoUrl, tamanho = 96, aoTrocar }: Props) {
  const [enviando, setEnviando] = useState(false);
  const circulo = { width: tamanho, height: tamanho, borderRadius: tamanho / 2 };

  const conteudo = fotoUrl ? (
    <Image source={{ uri: fotoUrl }} style={circulo} contentFit="cover" accessibilityLabel={`Foto de ${nome}`} />
  ) : (
    <View style={[estilos.vazio, circulo]} accessibilityLabel={`${nome} ainda sem foto`}>
      <Texto negrito cor={cores.secundaria} style={{ fontSize: tamanho * 0.42, lineHeight: tamanho * 0.5 }}>
        {inicial(nome)}
      </Texto>
    </View>
  );

  if (!aoTrocar) return conteudo;

  async function trocar() {
    const r = await getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setEnviando(true);
    const erro = await enviarFotoPet(petId, { uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType });
    setEnviando(false);
    aoTrocar?.(erro);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fotoUrl ? `Trocar a foto de ${nome}` : `Colocar uma foto de ${nome}`}
      onPress={() => void trocar()}
      style={estilos.editavel}
    >
      {conteudo}
      <View style={estilos.selo}>
        {enviando ? (
          <ActivityIndicator color={cores.sobrePrimaria} size="small" />
        ) : (
          <Icone nome="camera-outline" tamanho={16} cor={cores.sobrePrimaria} />
        )}
      </View>
    </Pressable>
  );
}

const estilos = criarEstilos(() => ({
  vazio: { backgroundColor: coresSuaves.info, alignItems: 'center', justifyContent: 'center' },
  editavel: { alignSelf: 'center', marginBottom: espaco.sm },
  selo: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: cores.fundo,
  },
}));
