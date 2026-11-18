import { StyleSheet, Text, TextProps } from 'react-native';
import { familiaPorPeso } from '../tema/fontes';
import { cores, fonte } from '../tema/tokens';

type Variante = 'titulo1' | 'titulo2' | 'corpo' | 'legenda';

interface Props extends TextProps {
  variante?: Variante;
  cor?: string;
  negrito?: boolean;
}

/** Texto com a tipografia do UX-02. Respeita a fonte ampliada do sistema (WCAG 1.4.4). */
export function Texto({
  variante = 'corpo',
  cor = cores.texto,
  negrito = false,
  style,
  ...props
}: Props) {
  const t = fonte[variante];
  const peso = negrito ? '600' : t.peso;
  return (
    <Text
      accessibilityRole={variante.startsWith('titulo') ? 'header' : undefined}
      style={[
        estilos.base,
        {
          fontSize: t.tamanho,
          lineHeight: t.alturaLinha,
          fontFamily: familiaPorPeso(peso),
          color: cor,
        },
        style,
      ]}
      {...props}
    />
  );
}

const estilos = StyleSheet.create({
  base: { flexShrink: 1 },
});
