import { useState } from 'react';
import { ActivityIndicator, Pressable, PressableProps, View } from 'react-native';
import { criarEstilos } from '../tema/estilos';
import { alvoToqueMinimo, cores, espaco, raio } from '../tema/tokens';
import { Icone } from './Icone';
import type { NomeIcone } from './Icone';
import { Texto } from './Texto';

type Variante = 'primaria' | 'secundaria' | 'perigo' | 'texto';

interface Props extends Omit<PressableProps, 'children'> {
  titulo: string;
  variante?: Variante;
  carregando?: boolean;
  larguraTotal?: boolean;
  /** Ícone antes do título. */
  icone?: NomeIcone;
}

/** Lido a cada render, para acompanhar o modo claro ou escuro. */
function aparencia(variante: Variante): { fundo: string; pressionado: string; texto: string; borda?: string } {
  switch (variante) {
    case 'primaria':
      return { fundo: cores.primaria, pressionado: cores.primariaEscura, texto: cores.sobrePrimaria };
    case 'secundaria':
      return { fundo: 'transparent', pressionado: cores.superficie, texto: cores.secundaria, borda: cores.secundaria };
    case 'perigo':
      return { fundo: cores.erro, pressionado: cores.erroEscuro, texto: cores.sobreCor };
    default:
      return { fundo: cores.elevado, pressionado: cores.superficie, texto: cores.destaque, borda: cores.cartaoBorda };
  }
}

/**
 * Botão do UX-02 em pílula, com estados padrão, pressionado, foco, desabilitado e carregando.
 * No celular, ações aparecem como botão e não como link sublinhado.
 */
export function Botao({
  titulo,
  variante = 'primaria',
  carregando = false,
  larguraTotal = false,
  icone,
  disabled,
  ...props
}: Props) {
  const [foco, setFoco] = useState(false);
  const inativo = disabled || carregando;
  const a = aparencia(variante);

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
        variante === 'texto' && estilos.texto,
        larguraTotal && estilos.larguraTotal,
        {
          backgroundColor: inativo ? cores.desabilitado : pressed ? a.pressionado : a.fundo,
          borderColor: inativo ? cores.desabilitado : (a.borda ?? 'transparent'),
        },
        foco && estilos.foco,
        pressed && !inativo && estilos.pressionado,
      ]}
      {...props}
    >
      <View style={estilos.conteudo}>
        {carregando && <ActivityIndicator color={cores.textoSecundario} />}
        {icone && !carregando && <Icone nome={icone} tamanho={18} cor={inativo ? cores.textoSecundario : a.texto} />}
        <Texto negrito cor={inativo ? cores.textoSecundario : a.texto}>
          {titulo}
        </Texto>
      </View>
    </Pressable>
  );
}

const estilos = criarEstilos(() => ({
  base: {
    minHeight: alvoToqueMinimo,
    minWidth: alvoToqueMinimo,
    paddingHorizontal: espaco.lg + 4,
    paddingVertical: espaco.sm,
    borderRadius: raio.pilula,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { paddingHorizontal: espaco.lg, alignSelf: 'flex-start' },
  larguraTotal: { alignSelf: 'stretch' },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  foco: { borderWidth: 2, borderColor: cores.secundaria },
  pressionado: { transform: [{ scale: 0.97 }] },
}));
