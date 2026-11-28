import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { sessao } from '../sessao/sessao';
import { fontesDoApp } from '../tema/fontes';
import { carregarPreferenciaTema, useModoTema } from '../tema/preferencia';
import { aplicarModo, cores } from '../tema/tokens';

void SplashScreen.preventAutoHideAsync();

export default function LayoutRaiz() {
  const [fontesCarregadas, erroFontes] = useFonts(fontesDoApp);
  const [sessaoPronta, setSessaoPronta] = useState(false);
  const [temaPronto, setTemaPronto] = useState(false);
  const modo = useModoTema();

  // Restaura a sessão pelo refresh token guardado antes de decidir a primeira tela.
  useEffect(() => {
    void sessao.renovar().finally(() => setSessaoPronta(true));
    void carregarPreferenciaTema().finally(() => setTemaPronto(true));
  }, []);

  // A paleta muda antes de desenhar as telas; a chave do Stack remonta tudo no modo novo.
  aplicarModo(modo);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(cores.fundo).catch(() => null);
  }, [modo]);

  const pronto = (fontesCarregadas || !!erroFontes) && sessaoPronta && temaPronto;
  useEffect(() => {
    if (pronto) void SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) return null;

  return (
    <>
      <StatusBar style={modo === 'escuro' ? 'light' : 'dark'} />
      <Stack
        key={modo}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cores.fundo },
        }}
      />
    </>
  );
}
