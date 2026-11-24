import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  AndroidImportance,
  getExpoPushTokenAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../api/cliente';

/** Token deste aparelho registrado na API nesta sessão, para tirar na saída. */
let tokenAtual: string | null = null;

/** Id do projeto no EAS, exigido pelo Expo para gerar o token de push (JAG-212). */
export function idDoProjeto(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

let handlerPronto = false;

/** Mostra a notificação também com o app aberto (configurado uma vez, no primeiro registro). */
function prepararHandler() {
  if (handlerPronto) return;
  handlerPronto = true;
  setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
  });
}

/**
 * Pede a permissão e registra o aparelho para receber push (UC-31). Em emulador, sem o
 * projeto EAS configurado ou sem permissão, não registra e devolve null: as notificações
 * continuam na lista do app.
 */
export async function registrarAparelho(): Promise<string | null> {
  const projectId = idDoProjeto();
  if (!Device.isDevice || !projectId) return null;
  prepararHandler();
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync('lembretes', {
      name: 'Lembretes do pet',
      importance: AndroidImportance.HIGH,
    });
  }
  let { status } = await getPermissionsAsync();
  if (status !== 'granted') status = (await requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const { data: token } = await getExpoPushTokenAsync({ projectId });
  const { error } = await api.POST('/dispositivos', {
    body: { token, plataforma: Platform.OS === 'ios' ? 'ios' : 'android' },
  });
  if (error) return null;
  tokenAtual = token;
  return token;
}

/** Tira o aparelho da conta antes de sair, para o push não chegar a quem saiu. */
export async function removerAparelho(): Promise<void> {
  if (!tokenAtual) return;
  const token = tokenAtual;
  tokenAtual = null;
  await api.DELETE('/dispositivos/{token}', { params: { path: { token } } }).catch(() => undefined);
}
