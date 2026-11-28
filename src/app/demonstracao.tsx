import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Alerta, Botao, Tela } from '../componentes';
import { sessao } from '../sessao/sessao';
import { cores } from '../tema/tokens';

/**
 * Entrada do "Ver como tutor" da demonstração: o link da Enterprise traz um código de uso único
 * que abre a sessão da tutora da mesma clínica de exemplo.
 */
export default function EntrarNaDemonstracao() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const [falhou, setFalhou] = useState(false);
  const erro = !codigo
    ? 'O link da demonstração está incompleto. Abra de novo pelo botão "Ver como tutor".'
    : falhou
      ? 'Esta demonstração expirou ou o link não vale mais. Comece uma nova demonstração na página do Jaguara.'
      : null;

  useEffect(() => {
    if (!codigo) return;
    sessao
      .entrarNaDemonstracao(codigo)
      .then(() => router.replace('/'))
      .catch(() => setFalhou(true));
  }, [codigo]);

  return (
    <Tela titulo="Demonstração" subtitulo="Entrando como a tutora da clínica de exemplo…">
      {erro ? (
        <>
          <Alerta tipo="erro" titulo="Não foi possível entrar" mensagem={erro} />
          <Botao titulo="Ir para o início" variante="secundaria" onPress={() => router.replace('/')} />
        </>
      ) : (
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Entrando na demonstração" />
      )}
    </Tela>
  );
}
