import { router } from 'expo-router';
import { Botao, Cartao, Opcoes, Tela, Texto } from '../../componentes';
import { removerAparelho } from '../../notificacoes/push';
import { sessao } from '../../sessao/sessao';
import { useUsuario } from '../../sessao/useUsuario';
import { escolherTema, usePreferenciaTema } from '../../tema/preferencia';
import type { PreferenciaTema } from '../../tema/preferencia';

const TEMAS: { valor: PreferenciaTema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'Igual ao celular' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
];

/** Aba Perfil: dados da conta, pagamentos, privacidade e notificações (UX-01, seção 3). */
export default function Perfil() {
  const usuario = useUsuario();
  const tema = usePreferenciaTema();
  return (
    <Tela titulo="Perfil">
      <Cartao titulo="Sua conta" subtitulo={usuario?.perfil}>
        <Texto variante="legenda">{usuario?.perfil === 'Tutor' ? 'Tutor no app do Jaguara.' : usuario?.perfil}</Texto>
      </Cartao>
      <Cartao titulo="Aparência" subtitulo="O modo escuro usa o verde da mata e cansa menos a vista à noite.">
        <Opcoes rotulo="Modo" opcoes={TEMAS} valor={tema} aoMudar={(v) => void escolherTema(v)} />
      </Cartao>
      <Cartao
        titulo="Notificações"
        subtitulo="Lembretes e preferências"
        aoTocar={() => router.push('/notificacoes')}
      />
      <Cartao
        titulo="Pagamentos"
        subtitulo="Histórico e reembolsos"
        aoTocar={() => router.push('/pagamentos')}
      />
      <Cartao
        titulo="Privacidade"
        subtitulo="Termos, exportação e exclusão dos dados"
        aoTocar={() => router.push('/privacidade')}
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
