import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Botao, Cartao, Icone, Opcoes, Tela, Texto } from '../componentes';
import type { NomeIcone } from '../componentes';
import { removerAparelho } from '../notificacoes/push';
import { sessao } from '../sessao/sessao';
import { criarEstilos } from '../tema/estilos';
import { escolherTema, usePreferenciaTema } from '../tema/preferencia';
import type { PreferenciaTema } from '../tema/preferencia';
import { cores, espaco } from '../tema/tokens';

const TEMAS: { valor: PreferenciaTema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'Igual ao celular' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
];

const ITENS: { titulo: string; detalhe: string; icone: NomeIcone; destino: '/notificacoes' | '/privacidade' | '/pagamentos' }[] = [
  { titulo: 'Notificações', detalhe: 'Lembretes e o que chega no celular', icone: 'bell-outline', destino: '/notificacoes' },
  { titulo: 'Privacidade e dados', detalhe: 'Termos, exportação e exclusão', icone: 'shield-account-outline', destino: '/privacidade' },
  { titulo: 'Pagamentos', detalhe: 'Histórico e reembolsos', icone: 'credit-card-outline', destino: '/pagamentos' },
];

/** Configurações do tutor num lugar só: aparência, notificações, privacidade, conta e sobre o app. */
export default function Configuracoes() {
  const tema = usePreferenciaTema();
  const versao = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Tela titulo="Configurações" subtitulo="Do jeito que fica melhor para você.">
      <Cartao titulo="Aparência" subtitulo="O modo escuro usa o verde da mata e cansa menos a vista à noite.">
        <Opcoes rotulo="Modo" opcoes={TEMAS} valor={tema} aoMudar={(v) => void escolherTema(v)} />
      </Cartao>

      <Cartao titulo="Preferências">
        {ITENS.map((item) => (
          <Pressable
            key={item.destino}
            accessibilityRole="button"
            accessibilityLabel={item.titulo}
            accessibilityHint={item.detalhe}
            onPress={() => router.push(item.destino)}
            style={({ pressed }) => [estilos.linha, pressed && { backgroundColor: cores.superficie }]}
          >
            <View style={estilos.icone}>
              <Icone nome={item.icone} tamanho={20} cor={cores.secundaria} />
            </View>
            <View style={estilos.textos}>
              <Texto negrito>{item.titulo}</Texto>
              <Texto variante="legenda" cor={cores.textoSecundario}>
                {item.detalhe}
              </Texto>
            </View>
            <Icone nome="chevron-right" tamanho={20} cor={cores.textoSecundario} />
          </Pressable>
        ))}
      </Cartao>

      <Cartao titulo="Conta">
        <Botao
          titulo="Sair da conta"
          variante="secundaria"
          icone="logout"
          larguraTotal
          onPress={() =>
            void removerAparelho()
              .then(() => sessao.sair())
              .then(() => router.replace('/boas-vindas'))
          }
        />
      </Cartao>

      <Cartao titulo="Sobre o app">
        <Texto variante="legenda" cor={cores.textoSecundario}>
          Jaguara, versão {versao}
        </Texto>
      </Cartao>

      <Botao titulo="Voltar" variante="texto" icone="arrow-left" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = criarEstilos(() => ({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    minHeight: 56,
    paddingVertical: espaco.sm,
    paddingHorizontal: espaco.xs,
    borderRadius: 12,
  },
  icone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.superficie,
  },
  textos: { flex: 1, gap: 2 },
}));
