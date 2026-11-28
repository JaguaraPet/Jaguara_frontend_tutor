import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { cores } from '../tema/tokens';

export type NomeIcone = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  nome: NomeIcone;
  tamanho?: number;
  cor?: string;
}

/**
 * Ícone vetorial do app (Material Design Icons), no lugar de emoji: o mesmo desenho em todo
 * aparelho e a mesma família da web. É decorativo: o texto ao lado diz o que ele significa.
 */
export function Icone({ nome, tamanho = 20, cor = cores.texto }: Props) {
  return (
    <MaterialCommunityIcons
      name={nome}
      size={tamanho}
      color={cor}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
