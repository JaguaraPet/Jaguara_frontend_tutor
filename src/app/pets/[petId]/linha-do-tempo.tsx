import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Opcoes, Tela, Texto } from '../../../componentes';
import { cores, espaco, raio } from '../../../tema/tokens';
import { criarEstilos } from '../../../tema/estilos';

type Item = components['schemas']['ItemLinhaDoTempo'];
type TipoItem = NonNullable<Item['tipo']>;
type Filtro = TipoItem | 'TODOS';

const ROTULO: Record<TipoItem, { rotulo: string; icone: ComponentProps<typeof MaterialCommunityIcons>['name'] }> = {
  VACINACAO: { rotulo: 'Vacina', icone: 'needle' },
  EXAME: { rotulo: 'Exame', icone: 'flask' },
  TRATAMENTO: { rotulo: 'Medicamento', icone: 'pill' },
  EVENTO: { rotulo: 'Compromisso', icone: 'calendar' },
  ATENDIMENTO: { rotulo: 'Atendimento', icone: 'stethoscope' },
  FOTO: { rotulo: 'Foto', icone: 'image' },
};

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'TODOS', rotulo: 'Tudo' },
  ...(Object.keys(ROTULO) as TipoItem[]).map((t) => ({ valor: t, rotulo: ROTULO[t].rotulo })),
];

const quando = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' }) : '';

/** Linha do tempo do pet (UC-35): vacinas, exames, remédios, compromissos e atendimentos em ordem. */
export default function LinhaDoTempo() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');

  useEffect(() => {
    let ativo = true;
    void api.GET('/pets/{petId}/linha-do-tempo', { params: { path: { petId } } }).then(({ data, error }) => {
      if (!ativo) return;
      setErro(!!error);
      setItens(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId]);

  // Mais recentes primeiro na tela; a API devolve em ordem cronológica.
  const visiveis = [...(itens ?? [])].reverse().filter((i) => filtro === 'TODOS' || i.tipo === filtro);

  return (
    <Tela titulo="Linha do tempo" subtitulo="Tudo o que aconteceu com o pet, do mais recente ao mais antigo.">
      {erro && <Alerta tipo="erro" titulo="Linha do tempo indisponível" />}
      <Opcoes<Filtro> rotulo="Mostrar" opcoes={FILTROS} valor={filtro} aoMudar={setFiltro} />
      {itens === null ? (
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando a linha do tempo" />
      ) : visiveis.length === 0 ? (
        <Texto cor={cores.textoSecundario}>Nada registrado ainda.</Texto>
      ) : (
        <View style={estilos.lista}>
          {visiveis.map((i, n) => {
            const info = ROTULO[i.tipo ?? 'EVENTO'];
            return (
              <View
                key={`${i.tipo}-${i.referenciaId}-${n}`}
                style={estilos.item}
                accessible
                accessibilityLabel={`${quando(i.data)}, ${info.rotulo}: ${i.titulo}`}
              >
                <View style={estilos.marca}>
                  <MaterialCommunityIcons name={info.icone} size={18} color={cores.sobreCor} />
                </View>
                <View style={estilos.texto}>
                  <Texto variante="legenda" cor={cores.textoSecundario}>
                    {quando(i.data)} · {info.rotulo}
                  </Texto>
                  <Texto>{i.titulo}</Texto>
                  {i.imagemUrl && (
                    <Image source={{ uri: i.imagemUrl }} style={estilos.foto} contentFit="cover" accessibilityLabel={i.titulo} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = criarEstilos(() => ({
  lista: { gap: espaco.md, alignSelf: 'stretch' },
  item: { flexDirection: 'row', gap: espaco.md, alignItems: 'flex-start' },
  marca: {
    width: 32,
    height: 32,
    borderRadius: raio.padrao * 2,
    backgroundColor: cores.secundaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flex: 1, gap: espaco.xs },
  foto: { width: '100%', aspectRatio: 4 / 3, borderRadius: raio.padrao * 2 },
}));
