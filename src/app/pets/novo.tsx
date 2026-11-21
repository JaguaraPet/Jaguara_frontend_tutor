import { router } from 'expo-router';
import { api } from '../../api/cliente';
import { Tela } from '../../componentes';
import { mensagemDaApi } from '../../pets/erros';
import { FormularioPet } from '../../pets/FormularioPet';
import { VAZIO } from '../../pets/formulario';

/** Cadastro do pet (UC-04): o tutor fica como responsável principal (RN09). */
export default function NovoPet() {
  return (
    <Tela titulo="Novo pet" subtitulo="Você fica como responsável principal.">
      <FormularioPet
        inicial={VAZIO}
        tituloBotao="Cadastrar pet"
        aoSalvar={async (pet) => {
          const { data, error } = await api.POST('/pets', { body: pet });
          if (error || !data) return mensagemDaApi(error);
          router.replace(`/pets/${data.id}/editar?novo=1`);
          return null;
        }}
      />
    </Tela>
  );
}
