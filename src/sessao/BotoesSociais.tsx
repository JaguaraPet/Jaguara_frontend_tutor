import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import { maybeCompleteAuthSession } from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Botao } from '../componentes';
import { espaco } from '../tema/tokens';
import type { PedidoSocial } from './sessao';

// Fecha a janela do navegador quando o Google volta para o app.
maybeCompleteAuthSession();

/** IDs de cliente OAuth do Google por plataforma; sem eles, o botão do Google não aparece. */
export const idsGoogle = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || undefined,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || undefined,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || undefined,
};

export function googleConfigurado(plataforma: string = Platform.OS): boolean {
  if (plataforma === 'android') return !!idsGoogle.androidClientId;
  if (plataforma === 'ios') return !!idsGoogle.iosClientId;
  return !!idsGoogle.webClientId;
}

type AoObterToken = (pedido: PedidoSocial) => void;

/** Google: pede o id_token com um nonce novo a cada tentativa (UC-02 FA04). */
function BotaoGoogle({ aoObterToken, ocupado }: { aoObterToken: AoObterToken; ocupado: boolean }) {
  const [nonce] = useState(() => randomUUID());
  const [pedido, resposta, abrir] = Google.useIdTokenAuthRequest({ ...idsGoogle, extraParams: { nonce } });
  const entregue = useRef<string | null>(null);

  useEffect(() => {
    if (resposta?.type !== 'success') return;
    const idToken = resposta.params.id_token;
    if (!idToken || entregue.current === idToken) return;
    entregue.current = idToken;
    aoObterToken({ provedor: 'GOOGLE', idToken, nonce });
  }, [resposta, nonce, aoObterToken]);

  return (
    <Botao
      titulo="Continuar com Google"
      variante="secundaria"
      larguraTotal
      disabled={!pedido || ocupado}
      onPress={() => void abrir()}
    />
  );
}

/** Apple (só no iPhone): a Apple recebe o SHA-256 do nonce e a API confere com o valor puro. */
function BotaoApple({ aoObterToken, ocupado }: { aoObterToken: AoObterToken; ocupado: boolean }) {
  async function entrar() {
    const nonce = randomUUID();
    try {
      const credencial = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: await digestStringAsync(CryptoDigestAlgorithm.SHA256, nonce),
      });
      if (credencial.identityToken) aoObterToken({ provedor: 'APPLE', idToken: credencial.identityToken, nonce });
    } catch {
      // O tutor fechou a janela da Apple: nada a fazer.
    }
  }
  return <Botao titulo="Continuar com Apple" variante="secundaria" larguraTotal disabled={ocupado} onPress={() => void entrar()} />;
}

/** Botões de login social que cabem na plataforma e na configuração do build. */
export function BotoesSociais({ aoObterToken, ocupado = false }: { aoObterToken: AoObterToken; ocupado?: boolean }) {
  const [apple, setApple] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setApple);
  }, []);
  const google = googleConfigurado();
  if (!google && !apple) return null;
  return (
    <View style={estilos.grupo}>
      {google && <BotaoGoogle aoObterToken={aoObterToken} ocupado={ocupado} />}
      {apple && <BotaoApple aoObterToken={aoObterToken} ocupado={ocupado} />}
    </View>
  );
}

const estilos = StyleSheet.create({ grupo: { gap: espaco.sm } });
