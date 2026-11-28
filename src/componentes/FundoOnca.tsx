import { Image, StyleSheet, View } from 'react-native';
import { modoEmUso } from '../tema/tokens';

const ESTAMPA = {
  claro: require('../../assets/images/onca-fundo-claro.png'),
  escuro: require('../../assets/images/onca-fundo-escuro.png'),
};

/**
 * Estampa de onça tom sobre tom atrás das telas (identidade Selvagem). É decorativa: fica
 * escondida do leitor de tela e não recebe toque.
 */
export function FundoOnca() {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image source={ESTAMPA[modoEmUso()]} resizeMode="repeat" style={estilo.imagem} />
    </View>
  );
}

const estilo = StyleSheet.create({ imagem: { width: '100%', height: '100%' } });
