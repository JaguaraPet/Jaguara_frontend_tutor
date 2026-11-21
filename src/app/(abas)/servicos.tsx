import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '../../api/cliente';
import { CATEGORIAS, local, rotuloCategoria, rotuloTipo } from '../../catalogo/catalogo';
import type { Categoria, EmpresaPublica } from '../../catalogo/catalogo';
import { Filtro } from '../../catalogo/Filtro';
import { Alerta, Botao, Campo, Cartao, Tela, Texto } from '../../componentes';
import { cores, espaco } from '../../tema/tokens';

const FALHA = 'Não deu para buscar agora. Confira a internet e tente de novo.';

/** Empresas com serviços ativos que combinam com o texto e a categoria. */
async function consultar(texto: string, categoria?: Categoria): Promise<EmpresaPublica[]> {
  const { data, error } = await api.GET('/empresas', {
    params: { query: { busca: texto.trim() || undefined, categoria, pagina: 1, tamanho: 30 } },
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

  const buscar = useCallback(async (texto: string, filtro?: Categoria) => {
    setCarregando(true);
    setErro(null);
    try {
      setEmpresas(await consultar(texto, filtro));
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
    void buscar(busca, nova);
  };

  return (
    <Tela titulo="Serviços" subtitulo="Encontre clínicas, pet shops, hotéis e creches.">
      <View style={estilos.busca}>
        <Campo
          rotulo="Buscar empresa ou serviço"
          placeholder="Ex.: banho, vacina, Clínica Patas"
          value={busca}
          onChangeText={setBusca}
          returnKeyType="search"
          onSubmitEditing={() => void buscar(busca, categoria)}
        />
        <Botao titulo="Buscar" onPress={() => void buscar(busca, categoria)} larguraTotal />
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
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Buscando empresas" />
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
