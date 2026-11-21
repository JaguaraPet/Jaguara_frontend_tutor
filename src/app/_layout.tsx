import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { sessao } from '../sessao/sessao';
import { fontesInter } from '../tema/fontes';
import { cores } from '../tema/tokens';

void SplashScreen.preventAutoHideAsync();

export default function LayoutRaiz() {
  const [fontesCarregadas, erroFontes] = useFonts(fontesInter);
  const [sessaoPronta, setSessaoPronta] = useState(false);

  // Restaura a sessão pelo refresh token guardado antes de decidir a primeira tela.
  useEffect(() => {
    void sessao.renovar().finally(() => setSessaoPronta(true));
  }, []);

  const pronto = (fontesCarregadas || !!erroFontes) && sessaoPronta;
  useEffect(() => {
    if (pronto) void SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

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
