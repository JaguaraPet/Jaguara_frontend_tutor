import { ReactNode } from 'react';
import { Pressable, View, ViewProps } from 'react-native';
import { cores, espaco, raio } from '../tema/tokens';
import { criarEstilos } from '../tema/estilos';
import { Icone } from './Icone';
import type { NomeIcone } from './Icone';
import { Texto } from './Texto';

interface Props extends ViewProps {
  titulo?: string;
  /** Ícone antes do título. */
  icone?: NomeIcone;
  subtitulo?: string;
  children?: ReactNode;
  /** Torna o cartão inteiro tocável (por exemplo, um pet na lista). */
  aoTocar?: () => void;
  rotuloAcessivel?: string;
}

/** Cartão translúcido da identidade Selvagem (UX-02), para agrupar informações. */
export function Cartao({ titulo, icone, subtitulo, children, aoTocar, rotuloAcessivel, style, ...props }: Props) {
  const conteudo = (
    <>
      {titulo &&
        (icone ? (
          <View style={estilos.titulo}>
            <Icone nome={icone} tamanho={22} cor={cores.secundaria} />
            <Texto variante="titulo2" style={estilos.tituloTexto}>
              {titulo}
            </Texto>
          </View>
        ) : (
          <Texto variante="titulo2">{titulo}</Texto>
        ))}
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

const estilos = criarEstilos(() => ({
  cartao: {
    backgroundColor: cores.cartao,
    borderWidth: 1,
    borderColor: cores.cartaoBorda,
    borderRadius: raio.cartao,
    padding: espaco.lg,
    gap: espaco.sm,
    alignSelf: 'stretch',
  },
  pressionado: { backgroundColor: cores.superficie },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
  tituloTexto: { flex: 1 },
}));
