import { Text, TextProps } from 'react-native';
import { criarEstilos } from '../tema/estilos';
import { familiaPorPeso } from '../tema/fontes';
import { cores, fonte } from '../tema/tokens';

type Variante = 'titulo1' | 'titulo2' | 'corpo' | 'legenda';

interface Props extends TextProps {
  variante?: Variante;
  cor?: string;
  negrito?: boolean;
}

/**
 * Texto com a tipografia do UX-02: títulos em Bricolage Grotesque, o resto em Inter.
 * Respeita a fonte ampliada do sistema (WCAG 1.4.4).
 */
export function Texto({ variante = 'corpo', cor, negrito = false, style, ...props }: Props) {
  const t = fonte[variante];
  const titulo = variante.startsWith('titulo');
  const peso = titulo ? '800' : negrito ? '600' : (t.peso as '400');
  return (
    <Text
      accessibilityRole={titulo ? 'header' : undefined}
      style={[
        estilos.base,
        {
          fontSize: t.tamanho,
          lineHeight: t.alturaLinha,
          fontFamily: familiaPorPeso(peso),
          color: cor ?? cores.texto,
        },
        titulo && estilos.titulo,
        style,
      ]}
      {...props}
    />
  );
}

const estilos = criarEstilos(() => ({
  base: { flexShrink: 1 },
  titulo: { letterSpacing: -0.2 },
}));
