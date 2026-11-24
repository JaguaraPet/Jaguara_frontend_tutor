import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api } from '../api/cliente';
import { registrarAparelho, removerAparelho } from './push';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[teste]', type: 'expo' })),
  AndroidImportance: { HIGH: 4 },
}));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'projeto-teste' } } }, easConfig: null },
}));

type Qualquer = Awaited<ReturnType<typeof api.POST>>;
const resposta = (status: number) =>
  Promise.resolve({ data: undefined, error: status >= 400 ? {} : undefined, response: new Response(null, { status }) } as unknown as Qualquer);

const permissao = (status: string) => Promise.resolve({ status } as unknown as Notifications.NotificationPermissionsStatus);

describe('UC-31 · Push no app', () => {
  beforeEach(() => {
    (Device as { isDevice: boolean }).isDevice = true;
    jest.mocked(Notifications.getPermissionsAsync).mockImplementation(() => permissao('granted'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve registrar o aparelho na API e tirá-lo na saída', async () => {
    const post = jest.spyOn(api, 'POST').mockImplementation(() => resposta(204) as never);
    const del = jest.spyOn(api, 'DELETE').mockImplementation(() => resposta(204) as never);
    await expect(registrarAparelho()).resolves.toBe('ExponentPushToken[teste]');
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'projeto-teste' });
    expect(post).toHaveBeenCalledWith('/dispositivos', {
      body: { token: 'ExponentPushToken[teste]', plataforma: expect.stringMatching(/ios|android/) as unknown as string },
    });
    await removerAparelho();
    expect(del).toHaveBeenCalledWith('/dispositivos/{token}', { params: { path: { token: 'ExponentPushToken[teste]' } } });
    del.mockClear();
    await removerAparelho();
    expect(del).not.toHaveBeenCalled();
  });

  it('não registra sem permissão, em emulador ou sem projeto EAS', async () => {
    const post = jest.spyOn(api, 'POST');
    jest.mocked(Notifications.getPermissionsAsync).mockImplementation(() => permissao('denied'));
    jest.mocked(Notifications.requestPermissionsAsync).mockImplementation(() => permissao('denied'));
    await expect(registrarAparelho()).resolves.toBeNull();
    (Device as { isDevice: boolean }).isDevice = false;
    await expect(registrarAparelho()).resolves.toBeNull();
    (Device as { isDevice: boolean }).isDevice = true;
    const config = Constants as unknown as { expoConfig: { extra: object } };
    const extraOriginal = config.expoConfig.extra;
    config.expoConfig.extra = {};
    await expect(registrarAparelho()).resolves.toBeNull();
    config.expoConfig.extra = extraOriginal;
    expect(post).not.toHaveBeenCalled();
  });
});
