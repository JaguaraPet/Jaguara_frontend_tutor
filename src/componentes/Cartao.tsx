import { ReactNode } from 'react';
import { Pressable, StyleSheet, View, ViewProps } from 'react-native';
import { cores, espaco, raio } from '../tema/tokens';
import { Texto } from './Texto';

interface Props extends ViewProps {
  titulo?: string;
  subtitulo?: string;
  children?: ReactNode;
  /** Torna o cartão inteiro tocável (por exemplo, um pet na lista). */
  aoTocar?: () => void;
  rotuloAcessivel?: string;
}

/** Cartão sobre a cor de superfície do UX-02, para agrupar informações. */
export function Cartao({ titulo, subtitulo, children, aoTocar, rotuloAcessivel, style, ...props }: Props) {
  const conteudo = (
    <>
      {titulo && <Texto variante="titulo2">{titulo}</Texto>}
      {subtitulo && (
        <Texto variante="legenda" cor={cores.textoSecundario}>
          {subtitulo}
        </Texto>
      )}
      {children}
    </>
  );

  if (aoTocar) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotuloAcessivel ?? titulo}
        onPress={aoTocar}
        style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado, style]}
      >
        {conteudo}
      </Pressable>
    );
  }
  return (
    <View style={[estilos.cartao, style]} {...props}>
      {conteudo}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: raio.padrao,
    padding: espaco.lg,
    gap: espaco.sm,
    alignSelf: 'stretch',
  },
  pressionado: { backgroundColor: cores.borda },
});
