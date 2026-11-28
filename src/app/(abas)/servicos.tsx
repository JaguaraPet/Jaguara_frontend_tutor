import * as Localizacao from 'expo-location';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../api/cliente';
import { CATEGORIAS, destaques, local, rotuloCategoria, rotuloTipo } from '../../catalogo/catalogo';
import type { Categoria, EmpresaPublica } from '../../catalogo/catalogo';
import { Filtro } from '../../catalogo/Filtro';
import { Alerta, Botao, Campo, Cartao, Tela, Texto } from '../../componentes';
import { cores, espaco } from '../../tema/tokens';

const FALHA = 'Não deu para buscar agora. Confira a internet e tente de novo.';

type Origem = { latitude: number; longitude: number } | 'cadastro';

/** Empresas com serviços ativos que combinam com o texto e a categoria; por perto, da mais próxima. */
async function consultar(texto: string, categoria?: Categoria, origem?: Origem): Promise<EmpresaPublica[]> {
  const perto = origem === 'cadastro' ? { perto: true } : origem ? { perto: true, ...origem } : {};
  const { data, error } = await api.GET('/empresas', {
    params: { query: { busca: texto.trim() || undefined, categoria, pagina: 1, tamanho: 30, ...perto } },
  });
  if (error || !data) throw new Error('Busca indisponível');
  return data.itens ?? [];
}

/**
 * Aba Serviços (UC-33): busca empresas com serviços ativos por nome ou serviço e filtra por
 * categoria. Tocar numa empresa abre o perfil com o catálogo.
 */
export default function Servicos() {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<Categoria | undefined>();
  const [empresas, setEmpresas] = useState<EmpresaPublica[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [origem, setOrigem] = useState<Origem | undefined>();
  const [aviso, setAviso] = useState<string | null>(null);

  const buscar = useCallback(async (texto: string, filtro?: Categoria, de?: Origem) => {
    setCarregando(true);
    setErro(null);
    try {
      setEmpresas(await consultar(texto, filtro, de));
    } catch {
      setErro(FALHA);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Primeira carga: todas as empresas com serviços ativos.
  useEffect(() => {
    let ativo = true;
    consultar('')
      .then((lista) => ativo && setEmpresas(lista))
      .catch(() => ativo && setErro(FALHA))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const escolherCategoria = (valor: Categoria) => {
    const nova = categoria === valor ? undefined : valor;
    setCategoria(nova);
    void buscar(busca, nova, origem);
  };

  /** Pede a localização só agora, quando o tutor toca em "Perto de mim". Sem ela, usa o CEP do cadastro. */
  async function pertoDeMim() {
    if (origem) {
      setOrigem(undefined);
      setAviso(null);
      void buscar(busca, categoria);
      return;
    }
    let nova: Origem = 'cadastro';
    try {
      const { granted } = await Localizacao.requestForegroundPermissionsAsync();
      if (granted) {
        const posicao = await Localizacao.getCurrentPositionAsync({ accuracy: Localizacao.Accuracy.Balanced });
        nova = { latitude: posicao.coords.latitude, longitude: posicao.coords.longitude };
      }
    } catch {
      // Sem GPS ou sem permissão: segue com o CEP do cadastro.
    }
    setAviso(nova === 'cadastro' ? 'Sem a localização, usamos o CEP do seu cadastro.' : null);
    setOrigem(nova);
    void buscar(busca, categoria, nova);
  }

  return (
    <Tela titulo="Serviços" subtitulo="Encontre clínicas, pet shops, hotéis e creches.">
      <View style={estilos.busca}>
        <Campo
          rotulo="Buscar empresa ou serviço"
          placeholder="Ex.: banho, vacina, Clínica Patas"
          value={busca}
          onChangeText={setBusca}
          returnKeyType="search"
          onSubmitEditing={() => void buscar(busca, categoria, origem)}
        />
        <Botao titulo="Buscar" onPress={() => void buscar(busca, categoria, origem)} larguraTotal />
        <Botao
          titulo={origem ? 'Ver todas, sem distância' : 'Perto de mim'}
          icone={origem ? undefined : 'map-marker-outline'}
          variante="secundaria"
          onPress={() => void pertoDeMim()}
          larguraTotal
        />
        {aviso && (
          <Texto variante="legenda" cor={cores.textoSecundario}>
            {aviso}
          </Texto>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.filtros}
        accessibilityLabel="Filtrar por categoria"
      >
        {CATEGORIAS.map((c) => (
          <Filtro
            key={c.valor}
            rotulo={c.rotulo}
            ativo={categoria === c.valor}
            aoTocar={() => escolherCategoria(c.valor)}
          />
        ))}
      </ScrollView>

      {erro && <Alerta tipo="erro" titulo="Busca indisponível" mensagem={erro} />}
      {carregando ? (
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Buscando empresas" />
      ) : (
        !erro &&
        (empresas.length === 0 ? (
          <Texto cor={cores.textoSecundario}>
            Nenhuma empresa encontrada. Tente outro termo ou tire o filtro.
          </Texto>
        ) : (
          <View style={estilos.lista}>
            <Texto variante="legenda" cor={cores.textoSecundario} accessibilityLiveRegion="polite">
              {empresas.length === 1 ? '1 empresa encontrada' : `${empresas.length} empresas encontradas`}
            </Texto>
            {empresas.map((empresa) => (
              <Cartao
                key={empresa.id}
                titulo={empresa.nomeFantasia}
                subtitulo={[rotuloTipo(empresa.tipo), local(empresa)].filter(Boolean).join(' · ')}
                rotuloAcessivel={`${empresa.nomeFantasia}, ${rotuloTipo(empresa.tipo)}. Ver serviços`}
                aoTocar={() => router.push(`/empresa/${empresa.id}`)}
              >
                {!!destaques(empresa) && <Texto negrito>{destaques(empresa)}</Texto>}
                {!!empresa.categorias?.length && (
                  <Texto variante="legenda">
                    {empresa.categorias.map(rotuloCategoria).join(', ')}
                  </Texto>
                )}
              </Cartao>
            ))}
          </View>
        ))
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  busca: { gap: espaco.md },
  filtros: { gap: espaco.sm, paddingVertical: espaco.xs },
  lista: { gap: espaco.md },
});
