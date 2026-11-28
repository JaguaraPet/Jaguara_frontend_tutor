import { Pressable } from 'react-native';
import { alvoToqueMinimo, cores, espaco, raio } from '../tema/tokens';
import { criarEstilos } from '../tema/estilos';
import { Texto } from '../componentes';

interface Props {
  rotulo: string;
  ativo: boolean;
  aoTocar: () => void;
}

/** Filtro de categoria: o estado vem também do texto para o leitor de tela (UX-02, seção 6). */
export function Filtro({ rotulo, ativo, aoTocar }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={`${rotulo}${ativo ? ', filtro ativo' : ''}`}
      onPress={aoTocar}
      style={[estilos.filtro, ativo && estilos.ativo]}
    >
      <Texto variante="legenda" negrito cor={ativo ? cores.sobrePrimaria : cores.texto}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

const estilos = criarEstilos(() => ({
  filtro: {
    minHeight: alvoToqueMinimo,
    justifyContent: 'center',
    paddingHorizontal: espaco.lg,
    borderRadius: raio.padrao,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  ativo: { backgroundColor: cores.primaria, borderColor: cores.primaria },
}));
