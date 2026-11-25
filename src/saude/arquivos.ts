import { Linking } from 'react-native';
import { api } from '../api/cliente';

/**
 * Abre um documento do pet: pede à API a URL assinada (5 minutos) e entrega ao sistema, que
 * baixa ou mostra o arquivo. Devolve false se não houver acesso.
 */
export async function abrirDocumento(documentoId: string): Promise<boolean> {
  const { data } = await api.GET('/documentos/{documentoId}/download', {
    params: { path: { documentoId } },
  });
  if (!data?.url) return false;
  await Linking.openURL(data.url);
  return true;
}
