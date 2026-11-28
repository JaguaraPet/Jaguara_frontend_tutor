import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

/** Fontes carregadas na inicialização do app (UX-02: Bricolage Grotesque nos títulos, Inter no texto). */
export const fontesDoApp = {
  'Inter-Regular': Inter_400Regular,
  'Inter-SemiBold': Inter_600SemiBold,
  'Inter-Bold': Inter_700Bold,
  'Bricolage-ExtraBold': BricolageGrotesque_800ExtraBold,
};

/** No React Native cada peso é uma família própria. O 800 é o dos títulos. */
export function familiaPorPeso(peso: '400' | '600' | '700' | '800'): string {
  if (peso === '800') return 'Bricolage-ExtraBold';
  if (peso === '700') return 'Inter-Bold';
  if (peso === '600') return 'Inter-SemiBold';
  return 'Inter-Regular';
}
