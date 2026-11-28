import { useId, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { familiaPorPeso } from '../tema/fontes';
import { alvoToqueMinimo, cores, espaco, fonte, raio } from '../tema/tokens';
import { Texto } from './Texto';

interface Props extends TextInputProps {
  rotulo: string;
  erro?: string;
  ajuda?: string;
  desabilitado?: boolean;
}

/**
 * Campo de texto com rótulo sempre visível (UX-02, seção 6). A mensagem de erro diz o que
 * corrigir e é anunciada pelo leitor de tela; a borda usa `textoSecundario` (contraste 3:1).
 */
export function Campo({ rotulo, erro, ajuda, desabilitado, style, onFocus, onBlur, ...props }: Props) {
  const [foco, setFoco] = useState(false);
  const id = useId();
  const corBorda = erro ? cores.erro : foco ? cores.destaque : cores.textoSecundario;

  return (
    <View style={estilos.grupo}>
      <Texto variante="legenda" negrito nativeID={`${id}-rotulo`}>
        {rotulo}
      </Texto>
      <TextInput
        accessibilityLabel={rotulo}
        accessibilityLabelledBy={`${id}-rotulo`}
        accessibilityState={{ disabled: !!desabilitado }}
        aria-invalid={!!erro}
        editable={!desabilitado}
        placeholderTextColor={cores.textoSecundario}
        onFocus={(e) => {
          setFoco(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFoco(false);
          onBlur?.(e);
        }}
        style={[
          estilos.campo,
          {
            borderColor: corBorda,
            borderWidth: foco || erro ? 2 : 1,
            backgroundColor: desabilitado ? cores.desabilitado : cores.elevado,
            color: desabilitado ? cores.textoSecundario : cores.texto,
          },
          style,
        ]}
        {...props}
      />
      {erro ? (
        <Texto variante="legenda" cor={cores.erro} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {erro}
        </Texto>
      ) : ajuda ? (
        <Texto variante="legenda" cor={cores.textoSecundario}>
          {ajuda}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaco.xs, alignSelf: 'stretch' },
  campo: {
    minHeight: alvoToqueMinimo,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    borderRadius: raio.padrao,
    fontSize: fonte.corpo.tamanho,
    fontFamily: familiaPorPeso('400'),
  },
});
