import { router } from 'expo-router';
import { useState } from 'react';
import { api } from '../api/cliente';
import { Alerta, Botao, Campo, Tela } from '../componentes';

/**
 * Esqueci minha senha (UC-03): a resposta é sempre a mesma, exista ou não a conta, para não
 * revelar quem tem cadastro (ARQ-02).
 */
export default function RecuperarSenha() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro('Informe um e-mail válido.');
      return;
    }
    setErro(null);
    setEnviando(true);
    const { response } = await api.POST('/auth/senha/recuperacao', { body: { email: email.trim() } });
    setEnviando(false);
    if (response.status >= 500 || response.status === 429) {
      setErro('Não foi possível enviar agora. Tente de novo em instantes.');
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <Tela titulo="Confira seu e-mail">
        <Alerta
          tipo="sucesso"
          titulo="Pedido recebido"
          mensagem={`Se ${email.trim()} tiver conta no Jaguara, chega um link para criar uma senha nova. Ele vale por 2 horas e só pode ser usado uma vez.`}
        />
        <Botao titulo="Voltar para o login" larguraTotal onPress={() => router.replace('/entrar')} />
      </Tela>
    );
  }

  return (
    <Tela titulo="Esqueci minha senha" subtitulo="Enviamos um link para você criar uma senha nova.">
      <Campo
        rotulo="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        erro={erro ?? undefined}
      />
      <Botao titulo="Enviar link" larguraTotal carregando={enviando} onPress={() => void enviar()} />
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}
