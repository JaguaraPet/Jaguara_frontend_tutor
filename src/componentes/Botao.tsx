import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
} from 'react-native';
import { alvoToqueMinimo, cores, espaco, raio } from '../tema/tokens';
import { Texto } from './Texto';

type Variante = 'primaria' | 'secundaria' | 'perigo' | 'texto';

interface Props extends Omit<PressableProps, 'children'> {
  titulo: string;
  variante?: Variante;
  carregando?: boolean;
  larguraTotal?: boolean;
}

const aparencia: Record<Variante, { fundo: string; pressionado: string; texto: string; borda?: string }> = {
  primaria: { fundo: cores.primaria, pressionado: cores.primariaEscura, texto: cores.branco },
  secundaria: { fundo: cores.fundo, pressionado: cores.superficie, texto: cores.secundaria, borda: cores.secundaria },
  perigo: { fundo: cores.erro, pressionado: '#8C1D17', texto: cores.branco },
  texto: { fundo: 'transparent', pressionado: cores.superficie, texto: cores.primaria },
};

/** Botão do UX-02 com estados padrão, pressionado, foco, desabilitado e carregando. */
export function Botao({
  titulo,
  variante = 'primaria',
  carregando = false,
  larguraTotal = false,
  disabled,
  ...props
}: Props) {
  const [foco, setFoco] = useState(false);
  const inativo = disabled || carregando;
  const a = aparencia[variante];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !!inativo, busy: carregando }}
      disabled={inativo}
      onFocus={() => setFoco(true)}
      onBlur={() => setFoco(false)}
      style={({ pressed }) => [
        estilos.base,
        larguraTotal && estilos.larguraTotal,
        {
          backgroundColor: inativo ? cores.desabilitado : pressed ? a.pressionado : a.fundo,
          borderColor: inativo ? cores.desabilitado : (a.borda ?? 'transparent'),
        },
        foco && estilos.foco,
      ]}
      {...props}
    >
      <View style={estilos.conteudo}>
        {carregando && <ActivityIndicator color={cores.textoSecundario} />}
        <Texto negrito cor={inativo ? cores.textoSecundario : a.texto}>
          {titulo}
        </Texto>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: alvoToqueMinimo,
    minWidth: alvoToqueMinimo,
    paddingHorizontal: espaco.xl,
    paddingVertical: espaco.md,
    borderRadius: raio.padrao,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  larguraTotal: { alignSelf: 'stretch' },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  foco: { borderWidth: 2, borderColor: cores.secundaria },
});
