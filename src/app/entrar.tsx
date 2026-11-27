import { Redirect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Alerta, Botao, Campo, Tela } from '../componentes';
import { BotoesSociais } from '../sessao/BotoesSociais';
import { ErroApi, sessao } from '../sessao/sessao';
import type { PedidoSocial } from '../sessao/sessao';
import { useUsuario } from '../sessao/useUsuario';
import { espaco } from '../tema/tokens';

/** Mensagem clara para cada recusa do UC-02 (RN02, RN03). */
export function mensagemDoErro(erro: unknown): string {
  if (erro instanceof ErroApi) {
    switch (erro.problema.codigo) {
      case 'CREDENCIAIS_INVALIDAS':
        return 'E-mail ou senha incorretos.';
      case 'RN03_CONTA_BLOQUEADA':
        return 'Muitas tentativas sem sucesso. Sua conta ficou bloqueada por 5 minutos.';
      case 'RN02_EMAIL_NAO_CONFIRMADO':
        return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
      case 'CONTA_INDISPONIVEL':
        return 'Esta conta não está ativa. Fale com o suporte do Jaguara.';
      case 'SO_TUTOR':
        return 'O app é dos tutores. Empresas usam o Jaguara Enterprise na web.';
      case 'DADOS_INVALIDOS':
        return 'Confira o e-mail e a senha.';
      case 'NAO_AUTENTICADO':
        return 'Não foi possível confirmar o login com o Google ou a Apple. Tente de novo.';
      case 'LOGIN_SOCIAL_INDISPONIVEL':
        return 'O login com Google ou Apple está indisponível agora. Entre com e-mail e senha.';
    }
  }
  return 'Não foi possível entrar agora. Confira a internet e tente de novo.';
}

/** Login do tutor no app (UC-02). Só tutores entram; empresas usam a web. */
export default function Entrar() {
  const usuario = useUsuario();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Login social (UC-02 FA04): guarda o pedido para repetir com a senha quando a conta já existe.
  const [social, setSocial] = useState<PedidoSocial | null>(null);
  const [senhaVinculo, setSenhaVinculo] = useState('');
  const [avisoVinculo, setAvisoVinculo] = useState<string | null>(null);

  const entrarSocial = useCallback(async (pedido: PedidoSocial) => {
    setErro(null);
    setEnviando(true);
    try {
      const resultado = await sessao.entrarSocial(pedido);
      if (resultado.tipo === 'entrou') {
        router.replace('/');
      } else if (resultado.tipo === 'senha') {
        setSocial({ ...pedido, senha: undefined });
        setAvisoVinculo(resultado.mensagem);
      } else {
        router.push({
          pathname: '/cadastro-social',
          params: { cadastroToken: resultado.cadastroToken, nome: resultado.nome ?? '', email: resultado.email },
        });
      }
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  }, []);

  if (usuario) return <Redirect href="/" />;

  async function enviar() {
    if (!email.trim() || !senha) {
      setErro('Informe o e-mail e a senha.');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await sessao.entrar(email.trim().toLowerCase(), senha);
      router.replace('/');
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela titulo="Entrar" subtitulo="Use o e-mail e a senha da sua conta do Jaguara.">
      {erro && <Alerta tipo="erro" titulo="Não foi possível entrar" mensagem={erro} />}
      <View style={estilos.formulario}>
        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <Campo
          rotulo="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void enviar()}
        />
        <Botao titulo="Entrar" larguraTotal carregando={enviando} onPress={() => void enviar()} />
        {social ? (
          <View style={estilos.formulario}>
            <Alerta tipo="info" titulo="Ligar à sua conta do Jaguara" mensagem={avisoVinculo ?? undefined} />
            <Campo rotulo="Senha da sua conta do Jaguara" value={senhaVinculo} onChangeText={setSenhaVinculo} secureTextEntry />
            <Botao
              titulo="Ligar e entrar"
              larguraTotal
              carregando={enviando}
              disabled={!senhaVinculo}
              onPress={() => void entrarSocial({ ...social, senha: senhaVinculo })}
            />
            <Botao titulo="Cancelar" variante="texto" onPress={() => setSocial(null)} />
          </View>
        ) : (
          <BotoesSociais aoObterToken={(p) => void entrarSocial(p)} ocupado={enviando} />
        )}
        <Botao
          titulo="Esqueci minha senha"
          variante="texto"
          larguraTotal
          onPress={() => router.push('/recuperar-senha')}
        />
        <Botao
          titulo="Ainda não tenho conta"
          variante="texto"
          larguraTotal
          onPress={() => router.replace('/cadastro')}
        />
      </View>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  formulario: { gap: espaco.md },
});
