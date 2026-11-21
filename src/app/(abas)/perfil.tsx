import { router } from 'expo-router';
import { Botao, Cartao, Tela, Texto } from '../../componentes';
import { sessao } from '../../sessao/sessao';
import { useUsuario } from '../../sessao/useUsuario';

/** Aba Perfil: dados da conta, pagamentos, privacidade e notificações (UX-01, seção 3). */
export default function Perfil() {
  const usuario = useUsuario();
  return (
    <Tela titulo="Perfil">
      <Cartao titulo="Sua conta" subtitulo={usuario?.perfil}>
        <Texto variante="legenda">Pagamentos, privacidade e notificações chegam nas próximas versões.</Texto>
      </Cartao>
      <Botao
        titulo="Sair"
        variante="secundaria"
        larguraTotal
        onPress={() => void sessao.sair().then(() => router.replace('/boas-vindas'))}
      />
    </Tela>
  );
}
