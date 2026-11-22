import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../api/cliente';
import { duracao, local, preco, rotuloCategoria, rotuloTipo } from '../../catalogo/catalogo';
import type { EmpresaPublica, Servico } from '../../catalogo/catalogo';
import { Alerta, Botao, Cartao, Tela, Texto } from '../../componentes';
import { cores, espaco } from '../../tema/tokens';

const FALHA = 'Não deu para abrir a empresa agora. Tente de novo.';

/** Perfil público da empresa e catálogo de serviços ativos (UC-33). */
export default function PerfilEmpresa() {
  const { empresaId } = useLocalSearchParams<{ empresaId: string }>();
  const [empresa, setEmpresa] = useState<EmpresaPublica | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      const caminho = { params: { path: { empresaId } } };
      const [perfil, catalogo] = await Promise.all([
        api.GET('/empresas/{empresaId}', caminho),
        api.GET('/empresas/{empresaId}/servicos', caminho),
      ]);
      if (!ativo) return;
      if (!perfil.data) {
        setErro(perfil.response.status === 404 ? 'Esta empresa não está mais disponível.' : FALHA);
        return;
      }
      setEmpresa(perfil.data);
      setServicos((catalogo.data ?? []).filter((s) => s.ativo !== false));
    };
    carregar().catch(() => {
      if (ativo) setErro(FALHA);
    });
    return () => {
      ativo = false;
    };
  }, [empresaId]);

  if (erro) {
    return (
      <Tela titulo="Empresa">
        <Alerta tipo="erro" titulo="Empresa indisponível" mensagem={erro} />
        <Botao titulo="Voltar para a busca" variante="secundaria" onPress={() => router.back()} />
      </Tela>
    );
  }
  if (!empresa) {
    return (
      <Tela titulo="Empresa">
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando a empresa" />
      </Tela>
    );
  }

  return (
    <Tela
      titulo={empresa.nomeFantasia ?? 'Empresa'}
      subtitulo={[rotuloTipo(empresa.tipo), local(empresa)].filter(Boolean).join(' · ')}
    >
      <Botao
        titulo="Conversar com a empresa"
        variante="secundaria"
        onPress={() =>
          router.push({
            pathname: '/chat/[empresaId]',
            params: { empresaId: empresa.id!, empresa: empresa.nomeFantasia ?? '' },
          })
        }
      />
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
      <Texto variante="titulo2">Serviços</Texto>
      {servicos.length === 0 ? (
        <Texto cor={cores.textoSecundario}>Esta empresa ainda não tem serviços ativos.</Texto>
      ) : (
        <View style={estilos.lista}>
          {servicos.map((servico) => (
            <Cartao key={servico.id} titulo={servico.nome} subtitulo={rotuloCategoria(servico.categoria)}>
              <Texto>{servico.descricao}</Texto>
              <View style={estilos.linha}>
                <Texto negrito>{preco(servico.preco)}</Texto>
                <Texto variante="legenda" cor={cores.textoSecundario}>
                  {duracao(servico.duracaoMinutos)}
                </Texto>
              </View>
              <Botao
                titulo="Solicitar agendamento"
                variante="secundaria"
                accessibilityLabel={`Solicitar ${servico.nome}`}
                onPress={() =>
                  router.push({
                    pathname: '/solicitar/[servicoId]',
                    params: { servicoId: servico.id!, servico: servico.nome, empresa: empresa.nomeFantasia ?? '' },
                  })
                }
              />
            </Cartao>
          ))}
        </View>
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: espaco.md },
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
