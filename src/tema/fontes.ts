import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

/** Fontes carregadas na inicialização do app (UX-02: Inter). */
export const fontesInter = {
  'Inter-Regular': Inter_400Regular,
  'Inter-SemiBold': Inter_600SemiBold,
  'Inter-Bold': Inter_700Bold,
};

/** No React Native cada peso é uma família própria. */
export function familiaPorPeso(peso: '400' | '600' | '700'): string {
  if (peso === '700') return 'Inter-Bold';
  if (peso === '600') return 'Inter-SemiBold';
  return 'Inter-Regular';
}
