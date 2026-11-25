import { router } from 'expo-router';
import { Botao, Cartao, Tela, Texto } from '../../componentes';
import { removerAparelho } from '../../notificacoes/push';
import { sessao } from '../../sessao/sessao';
import { useUsuario } from '../../sessao/useUsuario';

/** Aba Perfil: dados da conta, pagamentos, privacidade e notificações (UX-01, seção 3). */
export default function Perfil() {
  const usuario = useUsuario();
  return (
    <Tela titulo="Perfil">
      <Cartao titulo="Sua conta" subtitulo={usuario?.perfil}>
        <Texto variante="legenda">{usuario?.perfil === 'Tutor' ? 'Tutor no app do Jaguara.' : usuario?.perfil}</Texto>
      </Cartao>
      <Cartao
        titulo="Pagamentos"
        subtitulo="Histórico e reembolsos"
        aoTocar={() => router.push('/pagamentos')}
      />
      <Cartao
        titulo="Plano PANTERA"
        subtitulo="Assistente virtual para o seu pet"
        aoTocar={() => router.push('/pantera')}
      />
      <Botao
        titulo="Sair"
        variante="secundaria"
        larguraTotal
        onPress={() =>
          void removerAparelho()
            .then(() => sessao.sair())
            .then(() => router.replace('/boas-vindas'))
        }
      />
    </Tela>
  );
}
