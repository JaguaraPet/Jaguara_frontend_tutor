import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { mensagemDaApi } from '../pets/erros';

type TipoDocumento = components['schemas']['TipoDocumento'];

export interface ArquivoEscolhido {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export const TAMANHO_MAXIMO = 10 * 1024 * 1024;

/**
 * Envia o documento do pet (UC-34): a API registra e devolve a URL assinada; o arquivo vai do
 * aparelho direto para o armazenamento. Se o envio do arquivo falhar, o registro é desfeito.
 * Devolve null quando deu certo, ou a mensagem do que corrigir.
 */
export async function enviarDocumento(
  petId: string,
  dados: { titulo: string; tipo: TipoDocumento; arquivo: ArquivoEscolhido },
  http: typeof fetch = (...a) => fetch(...a),
): Promise<string | null> {
  const tamanho = dados.arquivo.size ?? 0;
  if (tamanho > TAMANHO_MAXIMO) return 'O arquivo passa de 10 MB.';
  const { data, error } = await api.POST('/pets/{petId}/documentos', {
    params: { path: { petId } },
    body: {
      titulo: dados.titulo.trim(),
      tipo: dados.tipo,
      nomeArquivo: dados.arquivo.name,
      tamanhoBytes: Math.max(1, tamanho),
    },
  });
  if (error || !data) return mensagemDaApi(error);
  try {
    const conteudo = await (await http(dados.arquivo.uri)).blob();
    const envio = await http(data.urlEnvio, {
      method: 'PUT',
      headers: dados.arquivo.mimeType ? { 'Content-Type': dados.arquivo.mimeType } : undefined,
      body: conteudo,
    });
    if (!envio.ok) throw new Error(`armazenamento respondeu ${envio.status}`);
    return null;
  } catch {
    await api.DELETE('/documentos/{documentoId}', { params: { path: { documentoId: data.documentoId } } });
    return 'Não foi possível enviar o arquivo. Confira a conexão e tente de novo.';
  }
}
