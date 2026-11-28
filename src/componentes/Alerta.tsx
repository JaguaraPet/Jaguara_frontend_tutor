import { View } from 'react-native';
import { criarEstilos } from '../tema/estilos';
import { cores, coresSuaves, espaco, raio } from '../tema/tokens';
import { Icone } from './Icone';
import type { NomeIcone } from './Icone';
import { Texto } from './Texto';

type Tipo = 'sucesso' | 'alerta' | 'erro' | 'info';

interface Props {
  tipo: Tipo;
  titulo: string;
  mensagem?: string;
}

const ICONES: Record<Tipo, { icone: NomeIcone; rotulo: string }> = {
  sucesso: { icone: 'check', rotulo: 'Sucesso' },
  alerta: { icone: 'exclamation', rotulo: 'Atenção' },
  erro: { icone: 'close', rotulo: 'Erro' },
  info: { icone: 'information-variant', rotulo: 'Informação' },
};

/** Cores lidas a cada render, para acompanhar o modo claro ou escuro. */
const corDo = (tipo: Tipo) =>
  ({
    sucesso: { cor: cores.sucesso, fundo: coresSuaves.sucesso },
    alerta: { cor: cores.alerta, fundo: coresSuaves.alerta },
    erro: { cor: cores.erro, fundo: coresSuaves.erro },
    info: { cor: cores.secundaria, fundo: coresSuaves.info },
  })[tipo];

/**
 * Alerta com cor, ícone e texto: a cor nunca é o único indicador (UX-02, seção 6).
 * Erros e alertas são anunciados pelo leitor de tela.
 */
export function Alerta({ tipo, titulo, mensagem }: Props) {
  const v = { ...ICONES[tipo], ...corDo(tipo) };
  const urgente = tipo === 'erro' || tipo === 'alerta';
  return (
    <View
      accessible
      accessibilityRole={urgente ? 'alert' : 'summary'}
      accessibilityLiveRegion={urgente ? 'assertive' : 'polite'}
      accessibilityLabel={`${v.rotulo}: ${titulo}${mensagem ? `. ${mensagem}` : ''}`}
      style={[estilos.alerta, { backgroundColor: v.fundo, borderColor: v.cor + '4D' }]}
    >
      <View style={[estilos.icone, { backgroundColor: v.cor }]}>
        <Icone nome={v.icone} tamanho={18} cor={cores.sobreCor} />
      </View>
      <View style={estilos.textos}>
        <Texto negrito cor={v.cor}>
          {titulo}
        </Texto>
        {mensagem && <Texto variante="legenda">{mensagem}</Texto>}
      </View>
    </View>
  );
}

const estilos = criarEstilos(() => ({
  alerta: {
    flexDirection: 'row',
    gap: espaco.md,
    padding: espaco.lg,
    // Contorno inteiro e fino, com o ícone num quadrado arredondado: sem faixa colorida de lado.
    borderRadius: raio.cartao - 4,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  icone: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: espaco.xs },
}));
