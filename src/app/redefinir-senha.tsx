import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api } from '../api/cliente';
import { Alerta, Botao, Campo, Tela } from '../componentes';
import { mensagemDaApi } from '../pets/erros';
import { problemaNaSenha } from '../sessao/cadastro';

/** Nova senha pelo link do e-mail (UC-03, RN06), aberto também como jaguara://redefinir-senha?token=. */
export default function RedefinirSenha() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [senha, setSenha] = useState('');
  const [repeticao, setRepeticao] = useState('');
  const [erroSenha, setErroSenha] = useState<string | undefined>();
  const [erroApi, setErroApi] = useState<{ titulo: string; mensagem?: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [pronto, setPronto] = useState(false);

  async function salvar() {
    const problema = problemaNaSenha(senha) ?? (senha !== repeticao ? 'As senhas não são iguais.' : null);
    setErroSenha(problema ?? undefined);
    if (problema || !token) return;
    setSalvando(true);
    const { error, response } = await api.POST('/auth/senha/redefinicao', { body: { token, novaSenha: senha } });
    setSalvando(false);
    if (response.status === 410) {
      setErroApi({ titulo: 'Link inválido ou expirado', mensagem: 'Peça um novo link em "Esqueci minha senha".' });
      return;
    }
    if (error) {
      setErroApi({ titulo: 'Senha não alterada', mensagem: mensagemDaApi(error) });
      return;
    }
    setPronto(true);
  }

  if (!token) {
    return (
      <Tela titulo="Nova senha">
        <Alerta tipo="erro" titulo="Link incompleto" mensagem="Abra o link do e-mail de novo ou peça outro." />
        <Botao titulo="Esqueci minha senha" larguraTotal onPress={() => router.replace('/recuperar-senha')} />
      </Tela>
    );
  }

  if (pronto) {
    return (
      <Tela titulo="Nova senha">
        <Alerta
          tipo="sucesso"
          titulo="Senha alterada"
          mensagem="Por segurança, as sessões abertas em outros aparelhos foram encerradas."
        />
        <Botao titulo="Entrar" larguraTotal onPress={() => router.replace('/entrar')} />
      </Tela>
    );
  }

  return (
    <Tela titulo="Nova senha" subtitulo="Não pode ser igual a uma das três últimas.">
      {erroApi && <Alerta tipo="erro" titulo={erroApi.titulo} mensagem={erroApi.mensagem} />}
      <Campo
        rotulo="Nova senha"
        secureTextEntry
        autoComplete="new-password"
        ajuda="Pelo menos 8 caracteres, com letras e números."
        value={senha}
        onChangeText={setSenha}
        erro={erroSenha}
      />
      <Campo rotulo="Repita a nova senha" secureTextEntry autoComplete="new-password" value={repeticao} onChangeText={setRepeticao} />
      <Botao titulo="Salvar nova senha" larguraTotal carregando={salvando} onPress={() => void salvar()} />
      {erroApi?.titulo === 'Link inválido ou expirado' && (
        <Botao titulo="Pedir novo link" variante="texto" onPress={() => router.replace('/recuperar-senha')} />
      )}
    </Tela>
  );
}
