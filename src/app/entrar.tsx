import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Alerta, Botao, Campo, Tela } from '../componentes';
import { ErroApi, sessao } from '../sessao/sessao';
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
