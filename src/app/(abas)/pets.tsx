import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Botao, Cartao, Opcoes, Tela, Texto } from '../../componentes';
import { textoIdade } from '../../pets/perfil';
import { cores, coresSuaves, espaco } from '../../tema/tokens';

type Pet = components['schemas']['Pet'];
type Status = components['schemas']['StatusPet'];

const FILTROS: { valor: Status; rotulo: string }[] = [
  { valor: 'ATIVO', rotulo: 'Ativos' },
  { valor: 'ARQUIVADO', rotulo: 'Arquivados' },
  { valor: 'FALECIDO', rotulo: 'Memorial' },
];

const VAZIO: Record<Status, string> = {
  ATIVO: 'Você ainda não cadastrou pets.',
  ARQUIVADO: 'Nenhum pet arquivado.',
  FALECIDO: 'Nenhum pet no memorial.',
};

/** Detalhe de cada pet na lista: espécie, raça e idade. */
const resumo = (p: Pet) => [p.especie, p.raca, textoIdade(p.idade)].filter(Boolean).join(' · ');

/** Aba Pets (UC-04, UX-01 seção 3): os pets do tutor, com filtro por situação e o cadastro. */
export default function Pets() {
  const [status, setStatus] = useState<Status>('ATIVO');
  const [lista, setLista] = useState<Pet[] | null>(null);
  const [erro, setErro] = useState(false);
  const [versao, setVersao] = useState(0);

  // Ao voltar do cadastro ou do perfil, a lista é buscada de novo.
  useFocusEffect(useCallback(() => setVersao((v) => v + 1), []));

  useEffect(() => {
    let ativo = true;
    void api
      .GET('/pets', { params: { query: { status, tamanho: 50 } } })
      .then(({ data, error }) => {
        if (!ativo) return;
        setErro(!!error);
        setLista(data?.itens ?? []);
      })
      .catch(() => {
        if (ativo) setErro(true);
      });
    return () => {
      ativo = false;
    };
  }, [status, versao]);

  function filtrar(s: Status) {
    setLista(null);
    setStatus(s);
  }

  return (
    <Tela titulo="Pets" subtitulo="Saúde, rotina e documentos de cada um.">
      <Botao titulo="Cadastrar pet" larguraTotal onPress={() => router.push('/pets/novo')} />
      <Opcoes rotulo="Situação" opcoes={FILTROS} valor={status} aoMudar={filtrar} />
      {erro ? (
        <Texto cor={cores.erro}>Não foi possível carregar os pets. Puxe a tela ou tente de novo em instantes.</Texto>
      ) : lista === null ? (
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando os pets" />
      ) : lista.length === 0 ? (
        <Texto cor={cores.textoSecundario}>{VAZIO[status]}</Texto>
      ) : (
        lista.map((p) => (
          <Cartao
            key={p.id}
            rotuloAcessivel={`Abrir o perfil de ${p.nome}`}
            aoTocar={() => router.push(`/pets/${p.id}`)}
          >
            <View style={estilos.linha}>
              {p.fotoUrl ? (
                <Image source={{ uri: p.fotoUrl }} style={estilos.foto} accessibilityIgnoresInvertColors />
              ) : (
                <View style={[estilos.foto, estilos.semFoto]}>
                  <Texto negrito cor={cores.primaria}>
                    {p.nome.charAt(0).toUpperCase()}
                  </Texto>
                </View>
              )}
              <View style={estilos.textos}>
                <Texto negrito>{p.nome}</Texto>
                <Texto variante="legenda" cor={cores.textoSecundario}>
                  {resumo(p)}
                </Texto>
              </View>
            </View>
          </Cartao>
        ))
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.md },
  foto: { width: 48, height: 48, borderRadius: 24 },
  semFoto: { backgroundColor: coresSuaves.alerta, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: espaco.xs },
});
