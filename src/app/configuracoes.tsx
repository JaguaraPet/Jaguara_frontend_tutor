import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../api/cliente';
import { Alerta, Botao, Cartao, Icone, Opcoes, Tela, Texto } from '../componentes';
import type { NomeIcone } from '../componentes';
import { removerAparelho } from '../notificacoes/push';
import { sessao } from '../sessao/sessao';
import { criarEstilos } from '../tema/estilos';
import { escolherTema, usePreferenciaTema } from '../tema/preferencia';
import type { PreferenciaTema } from '../tema/preferencia';
import { cores, espaco } from '../tema/tokens';

const TEMAS: { valor: PreferenciaTema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'Igual ao celular' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
];

const ITENS: { titulo: string; detalhe: string; icone: NomeIcone; destino: '/meus-dados' | '/notificacoes' | '/privacidade' | '/pagamentos' }[] = [
  { titulo: 'Meus dados', detalhe: 'Nome, telefone e e-mail de acesso', icone: 'account-outline', destino: '/meus-dados' },
  { titulo: 'Notificações', detalhe: 'Lembretes e o que chega no celular', icone: 'bell-outline', destino: '/notificacoes' },
  { titulo: 'Privacidade e dados', detalhe: 'Termos, exportação e exclusão', icone: 'shield-account-outline', destino: '/privacidade' },
  { titulo: 'Pagamentos', detalhe: 'Histórico e reembolsos', icone: 'credit-card-outline', destino: '/pagamentos' },
];

/** Configurações do tutor num lugar só: aparência, notificações, privacidade, conta (com a troca de senha) e sobre o app. */
export default function Configuracoes() {
  const tema = usePreferenciaTema();
  const versao = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Tela titulo="Configurações" subtitulo="Do jeito que fica melhor para você.">
      <Cartao titulo="Aparência" subtitulo="O modo escuro usa o verde da mata e cansa menos a vista à noite.">
        <Opcoes rotulo="Modo" opcoes={TEMAS} valor={tema} aoMudar={(v) => void escolherTema(v)} />
      </Cartao>

      <Cartao titulo="Preferências">
        {ITENS.map((item) => (
          <Pressable
            key={item.destino}
            accessibilityRole="button"
            accessibilityLabel={item.titulo}
            accessibilityHint={item.detalhe}
            onPress={() => router.push(item.destino)}
            style={({ pressed }) => [estilos.linha, pressed && { backgroundColor: cores.superficie }]}
          >
            <View style={estilos.icone}>
              <Icone nome={item.icone} tamanho={20} cor={cores.secundaria} />
            </View>
            <View style={estilos.textos}>
              <Texto negrito>{item.titulo}</Texto>
              <Texto variante="legenda" cor={cores.textoSecundario}>
                {item.detalhe}
              </Texto>
            </View>
            <Icone nome="chevron-right" tamanho={20} cor={cores.textoSecundario} />
          </Pressable>
        ))}
      </Cartao>

      <Cartao titulo="Conta">
        <TrocarSenha />
        <Botao
          titulo="Sair da conta"
          variante="secundaria"
          icone="logout"
          larguraTotal
          onPress={() =>
            void removerAparelho()
              .then(() => sessao.sair())
              .then(() => router.replace('/boas-vindas'))
          }
        />
      </Cartao>

      <Cartao titulo="Sobre o app">
        <Texto variante="legenda" cor={cores.textoSecundario}>
          Jaguara, versão {versao}
        </Texto>
      </Cartao>

    </Tela>
  );
}

/** Contas da demonstração usam um domínio que não recebe e-mail. */
const DEMONSTRACAO = /@demonstracao\.invalid$/i;

type Aviso = { tipo: 'sucesso' | 'erro' | 'info'; titulo: string; mensagem?: string };

/**
 * Trocar a senha com a conta aberta (UC-03): a troca é sempre pelo link de 2 horas enviado ao
 * e-mail da conta, o mesmo do "Esqueci minha senha", e nunca direto nesta tela.
 */
function TrocarSenha() {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  async function enviar() {
    setEnviando(true);
    setAviso(null);
    const conta = await api.GET('/conta').catch(() => null);
    const email = conta?.data?.email;
    if (!email) {
      setEnviando(false);
      setAviso({ tipo: 'erro', titulo: 'Não foi possível enviar agora', mensagem: 'Tente de novo em instantes.' });
      return;
    }
    if (DEMONSTRACAO.test(email)) {
      setEnviando(false);
      setAviso({
        tipo: 'info',
        titulo: 'Na demonstração a senha não muda',
        mensagem: 'Na sua conta, o link para trocar a senha chega por e-mail.',
      });
      return;
    }
    const resposta = await api.POST('/auth/senha/recuperacao', { body: { email } }).catch(() => null);
    setEnviando(false);
    if (!resposta || resposta.response.status >= 500 || resposta.response.status === 429) {
      setAviso({ tipo: 'erro', titulo: 'Não foi possível enviar agora', mensagem: 'Tente de novo em instantes.' });
      return;
    }
    setAviso({
      tipo: 'sucesso',
      titulo: 'Confira seu e-mail',
      mensagem: `Enviamos para ${email} um link que vale por 2 horas para criar a senha nova.`,
    });
  }

  return (
    <View style={estilos.senha}>
      <Texto variante="legenda" cor={cores.textoSecundario}>
        Para trocar a senha, enviamos um link para o e-mail da sua conta.
      </Texto>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      <Botao
        titulo="Trocar senha"
        variante="secundaria"
        icone="lock-reset"
        larguraTotal
        carregando={enviando}
        onPress={() => void enviar()}
      />
    </View>
  );
}

const estilos = criarEstilos(() => ({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    minHeight: 56,
    paddingVertical: espaco.sm,
    paddingHorizontal: espaco.xs,
    borderRadius: 12,
  },
  icone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.superficie,
  },
  textos: { flex: 1, gap: 2 },
  senha: { gap: espaco.sm, marginBottom: espaco.sm },
}));
