import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { fontesInter } from '../tema/fontes';
import { cores } from '../tema/tokens';

void SplashScreen.preventAutoHideAsync();

export default function LayoutRaiz() {
  const [fontesCarregadas, erroFontes] = useFonts(fontesInter);

  useEffect(() => {
    if (fontesCarregadas || erroFontes) void SplashScreen.hideAsync();
  }, [fontesCarregadas, erroFontes]);

  // Sem a fonte, segue com a do sistema em vez de travar na abertura.
  if (!fontesCarregadas && !erroFontes) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cores.fundo },
        }}
      />
    </>
  );
}
