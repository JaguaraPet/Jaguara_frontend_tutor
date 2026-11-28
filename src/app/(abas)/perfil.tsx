import { router } from 'expo-router';
import { Botao, Cartao, Tela } from '../../componentes';
import { removerAparelho } from '../../notificacoes/push';
import { sessao } from '../../sessao/sessao';

/** Aba Perfil: dados da conta, configurações, pagamentos e plano (UX-01, seção 3). */
export default function Perfil() {
  return (
    <Tela titulo="Perfil">
      <Cartao titulo="Meus dados" subtitulo="Nome, telefone e e-mail de acesso" aoTocar={() => router.push('/meus-dados')} />
      <Cartao
        titulo="Configurações"
        subtitulo="Aparência, notificações e privacidade"
        aoTocar={() => router.push('/configuracoes')}
      />
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
