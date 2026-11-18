import { StyleSheet, View } from 'react-native';
import { cores, coresSuaves, espaco, raio } from '../tema/tokens';
import { Texto } from './Texto';

type Tipo = 'sucesso' | 'alerta' | 'erro' | 'info';

interface Props {
  tipo: Tipo;
  titulo: string;
  mensagem?: string;
}

const visual: Record<Tipo, { cor: string; fundo: string; icone: string; rotulo: string }> = {
  sucesso: { cor: cores.sucesso, fundo: coresSuaves.sucesso, icone: '✓', rotulo: 'Sucesso' },
  alerta: { cor: cores.alerta, fundo: coresSuaves.alerta, icone: '!', rotulo: 'Atenção' },
  erro: { cor: cores.erro, fundo: coresSuaves.erro, icone: '✕', rotulo: 'Erro' },
  info: { cor: cores.secundaria, fundo: coresSuaves.info, icone: 'i', rotulo: 'Informação' },
};

/**
 * Alerta com cor, ícone e texto: a cor nunca é o único indicador (UX-02, seção 6).
 * Erros e alertas são anunciados pelo leitor de tela.
 */
export function Alerta({ tipo, titulo, mensagem }: Props) {
  const v = visual[tipo];
  const urgente = tipo === 'erro' || tipo === 'alerta';
  return (
    <View
      accessible
      accessibilityRole={urgente ? 'alert' : 'summary'}
      accessibilityLiveRegion={urgente ? 'assertive' : 'polite'}
      accessibilityLabel={`${v.rotulo}: ${titulo}${mensagem ? `. ${mensagem}` : ''}`}
      style={[estilos.alerta, { backgroundColor: v.fundo, borderLeftColor: v.cor }]}
    >
      <View style={[estilos.icone, { backgroundColor: v.cor }]}>
        <Texto negrito cor={cores.branco} importantForAccessibility="no">
          {v.icone}
        </Texto>
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

const estilos = StyleSheet.create({
  alerta: {
    flexDirection: 'row',
    gap: espaco.md,
    padding: espaco.lg,
    borderRadius: raio.padrao,
    borderLeftWidth: 4,
    alignSelf: 'stretch',
  },
  icone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: espaco.xs },
});
