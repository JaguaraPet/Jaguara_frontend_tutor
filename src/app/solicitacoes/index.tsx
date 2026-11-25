import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Botao, Cartao, Opcoes, Tela, Texto } from '../../componentes';
import { quandoSolicitacao, rotuloStatus } from '../../agendamento/acompanhamento';
import { cores } from '../../tema/tokens';

type Detalhe = components['schemas']['DetalheSolicitacao'];
type Filtro = 'ABERTAS' | 'TODAS';

/** Minhas solicitações (UC-42, RN38): pendentes e aceitas primeiro, com o status de cada uma. */
export default function MinhasSolicitacoes() {
  const [lista, setLista] = useState<Detalhe[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('ABERTAS');

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      void api.GET('/minhas-solicitacoes').then(({ data }) => {
        if (ativo) setLista(data ?? []);
      });
      return () => {
        ativo = false;
      };
    }, []),
  );

  const visiveis = (lista ?? []).filter(
    (s) => filtro === 'TODAS' || s.status === 'PENDENTE' || s.status === 'ACEITA',
  );

  return (
    <Tela titulo="Minhas solicitações" subtitulo="Acompanhe os pedidos de agendamento.">
      <Opcoes<Filtro>
        rotulo="Mostrar"
        opcoes={[
          { valor: 'ABERTAS', rotulo: 'Em andamento' },
          { valor: 'TODAS', rotulo: 'Todas' },
        ]}
        valor={filtro}
        aoMudar={setFiltro}
      />
      {lista === null ? (
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando as solicitações" />
      ) : lista.length === 0 ? (
        <>
          <Texto cor={cores.textoSecundario}>Você ainda não possui solicitações de serviço.</Texto>
          <Botao titulo="Ver serviços" larguraTotal onPress={() => router.replace('/servicos')} />
        </>
      ) : visiveis.length === 0 ? (
        <Texto cor={cores.textoSecundario}>Nenhuma solicitação em andamento.</Texto>
      ) : (
        visiveis.map((s) => (
          <Cartao
            key={s.id}
            titulo={`${s.servico.nome} · ${s.pet.nome}`}
            subtitulo={`${s.empresa.nome} · ${quandoSolicitacao(s)}`}
            aoTocar={() => router.push(`/solicitacoes/${s.id}`)}
            rotuloAcessivel={`${s.servico.nome} para ${s.pet.nome}, ${rotuloStatus(s)}`}
          >
            <Texto negrito>{rotuloStatus(s)}</Texto>
          </Cartao>
        ))
      )}
    </Tela>
  );
}
