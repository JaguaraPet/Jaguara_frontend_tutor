import { router } from 'expo-router';
import { Botao, Tela } from '../../componentes';

/** Aba Pets (UX-01, seção 3): cadastro do pet. A lista dos pets chega em outra entrega. */
export default function Pets() {
  return (
    <Tela titulo="Pets" subtitulo="Cadastre seus pets para acompanhar saúde e rotina.">
      <Botao titulo="Cadastrar pet" larguraTotal onPress={() => router.push('/pets/novo')} />
    </Tela>
  );
}
