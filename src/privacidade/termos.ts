import { api } from '../api/cliente';
import type { components } from '../api/esquema';

type Consentimento = components['schemas']['Consentimento'];

/** Termos obrigatórios ainda não aceitos (RN42): a versão nova pede aceite antes das demais telas. */
export const pendentes = (lista: Consentimento[]) => lista.filter((c) => c.obrigatorio && !c.aceito);

/** CT-46-03: verifica se há versão nova de termo obrigatório esperando o aceite do tutor. */
export async function temTermoPendente(): Promise<boolean> {
  const { data } = await api.GET('/privacidade/consentimentos');
  return pendentes(data ?? []).length > 0;
}
