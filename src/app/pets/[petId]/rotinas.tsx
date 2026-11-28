import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Icone, Opcoes, Tela, Texto } from '../../../componentes';
import type { NomeIcone } from '../../../componentes';
import { mensagemDaApi } from '../../../pets/erros';
import { cores, espaco } from '../../../tema/tokens';
import { criarEstilos } from '../../../tema/estilos';

type Rotina = components['schemas']['Rotina'];
type Modelo = components['schemas']['ModeloRotina'];
type Frequencia = components['schemas']['FrequenciaRotina'];
type Tipo = components['schemas']['TipoRotina'];

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FREQUENCIAS: { valor: Frequencia; rotulo: string }[] = [
  { valor: 'DIARIA', rotulo: 'Todo dia' },
  { valor: 'SEMANAL', rotulo: 'Dias da semana' },
  { valor: 'INTERVALO_DIAS', rotulo: 'A cada N dias' },
  { valor: 'MENSAL', rotulo: 'Todo mês' },
];
const ICONE: Record<Tipo, NomeIcone> = {
  PASSEIO: 'dog-side',
  BANHO: 'shower-head',
  ANTIPULGAS: 'bug-outline',
  VERMIFUGO: 'pill',
  ESCOVACAO: 'toothbrush',
  AREIA: 'broom',
  ALIMENTACAO: 'bowl-mix-outline',
  OUTRO: 'star-outline',
};

function descreverRegra(r: Pick<Rotina, 'frequencia' | 'intervaloDias' | 'diasSemana' | 'horarios'>): string {
  const quando =
    r.frequencia === 'DIARIA'
      ? 'Todo dia'
      : r.frequencia === 'SEMANAL'
        ? (r.diasSemana ?? []).map((d) => DIAS[d]).join(', ')
        : r.frequencia === 'MENSAL'
          ? 'Todo mês'
          : `A cada ${r.intervaloDias} dias`;
  return r.horarios?.length ? `${quando} · ${r.horarios.join(' e ')}` : quando;
}

interface Rascunho {
  titulo: string;
  tipo: Tipo;
  frequencia: Frequencia;
  intervaloDias: string;
  diasSemana: number[];
  horarios: string;
}

const vazio: Rascunho = { titulo: '', tipo: 'OUTRO', frequencia: 'DIARIA', intervaloDias: '15', diasSemana: [], horarios: '' };

/**
 * Criador de rotinas: modelos prontos e editáveis (passeio, banho, antipulgas...). Cada rotina
 * aparece no dia do pet e manda lembrete a todos os responsáveis. O app não diz com que
 * frequência fazer: os modelos são atalhos, e a orientação vem do veterinário do pet.
 */
export default function Rotinas() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [rotinas, setRotinas] = useState<Rotina[] | null>(null);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void Promise.all([
      api.GET('/pets/{petId}/rotinas', { params: { path: { petId } } }),
      api.GET('/rotinas/modelos'),
    ]).then(([lista, catalogo]) => {
      if (!ativo) return;
      setRotinas(lista.data ?? []);
      setModelos(catalogo.data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  function usarModelo(m: Modelo) {
    setErro(null);
    setRascunho({
      titulo: m.titulo,
      tipo: m.tipo,
      frequencia: m.frequencia,
      intervaloDias: String(m.intervaloDias ?? 15),
      diasSemana: m.diasSemana ?? [],
      horarios: m.horarios.join(', '),
    });
  }

  async function salvar() {
    if (!rascunho) return;
    const horarios = rascunho.horarios
      .split(/[,;\s]+/)
      .map((h) => h.trim())
      .filter(Boolean)
      .map((h) => (/^\d:\d\d$/.test(h) ? `0${h}` : h));
    setSalvando(true);
    const { error } = await api.POST('/pets/{petId}/rotinas', {
      params: { path: { petId } },
      body: {
        titulo: rascunho.titulo.trim(),
        tipo: rascunho.tipo,
        frequencia: rascunho.frequencia,
        ...(rascunho.frequencia === 'INTERVALO_DIAS' ? { intervaloDias: Number(rascunho.intervaloDias) } : {}),
        ...(rascunho.frequencia === 'SEMANAL' ? { diasSemana: rascunho.diasSemana } : {}),
        horarios,
      },
    });
    setSalvando(false);
    if (error) {
      setErro(mensagemDaApi(error));
      return;
    }
    setRascunho(null);
    setVersao((v) => v + 1);
  }

  async function encerrar(r: Rotina) {
    await api.DELETE('/rotinas/{rotinaId}', { params: { path: { rotinaId: r.id } } });
    setVersao((v) => v + 1);
  }

  if (rotinas === null) {
    return (
      <Tela titulo="Rotinas">
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando as rotinas" />
      </Tela>
    );
  }

  return (
    <Tela titulo="Rotinas" subtitulo="O que se repete no cuidado do pet. Aparece no Início e manda lembrete para a família.">
      {rotinas.length === 0 && !rascunho && (
        <Texto cor={cores.textoSecundario}>Nenhuma rotina ainda. Comece por um modelo abaixo.</Texto>
      )}
      {rotinas.map((r) => (
        <Cartao key={r.id} titulo={r.titulo} icone={ICONE[r.tipo]} subtitulo={descreverRegra(r)}>
          <Botao titulo="Encerrar" variante="texto" accessibilityLabel={`Encerrar ${r.titulo}`} onPress={() => void encerrar(r)} />
        </Cartao>
      ))}

      {rascunho ? (
        <Cartao titulo="Nova rotina">
          <Campo rotulo="Nome" value={rascunho.titulo} onChangeText={(t) => setRascunho({ ...rascunho, titulo: t })} />
          <Opcoes
            rotulo="Quando"
            opcoes={FREQUENCIAS}
            valor={rascunho.frequencia}
            aoMudar={(f) => setRascunho({ ...rascunho, frequencia: f })}
          />
          {rascunho.frequencia === 'INTERVALO_DIAS' && (
            <Campo
              rotulo="A cada quantos dias"
              keyboardType="number-pad"
              value={rascunho.intervaloDias}
              onChangeText={(t) => setRascunho({ ...rascunho, intervaloDias: t.replace(/\D/g, '') })}
            />
          )}
          {rascunho.frequencia === 'SEMANAL' && (
            <View style={estilos.dias} accessibilityLabel="Dias da semana">
              {DIAS.map((d, i) => {
                const marcado = rascunho.diasSemana.includes(i);
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: marcado }}
                    onPress={() =>
                      setRascunho({
                        ...rascunho,
                        diasSemana: marcado ? rascunho.diasSemana.filter((x) => x !== i) : [...rascunho.diasSemana, i],
                      })
                    }
                    style={[estilos.dia, marcado && estilos.diaMarcado]}
                  >
                    <Texto style={marcado ? { color: cores.sobrePrimaria, fontWeight: '700' } : undefined}>{d}</Texto>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Campo
            rotulo="Horários (opcional)"
            placeholder="Ex.: 07:00, 19:00"
            value={rascunho.horarios}
            onChangeText={(t) => setRascunho({ ...rascunho, horarios: t })}
          />
          {erro && <Alerta tipo="erro" titulo={erro} />}
          <View style={estilos.acoes}>
            <Botao titulo="Salvar rotina" carregando={salvando} onPress={() => void salvar()} />
            <Botao titulo="Cancelar" variante="texto" onPress={() => setRascunho(null)} />
          </View>
        </Cartao>
      ) : (
        <>
          <Texto variante="titulo2">Começar por um modelo</Texto>
          <View style={estilos.modelos}>
            {modelos.map((m) => (
              <Pressable
                key={m.tipo}
                accessibilityRole="button"
                onPress={() => usarModelo(m)}
                style={({ pressed }) => [estilos.modelo, pressed && { backgroundColor: cores.superficie }]}
              >
                <View style={estilos.modeloCabeca}>
                  <Icone nome={ICONE[m.tipo]} tamanho={20} cor={cores.secundaria} />
                  <Texto style={estilos.modeloTitulo}>{m.titulo}</Texto>
                </View>
                <Texto variante="legenda" cor={cores.textoSecundario}>
                  {m.descricao}
                </Texto>
              </Pressable>
            ))}
          </View>
          <Botao titulo="Criar do zero" variante="secundaria" larguraTotal onPress={() => setRascunho({ ...vazio })} />
        </>
      )}
      <Texto variante="legenda" cor={cores.textoSecundario}>
        Os modelos são só atalhos. A frequência de antipulgas, vermífugo e banho é a que o veterinário do seu pet indicar.
      </Texto>
    </Tela>
  );
}

const estilos = criarEstilos(() => ({
  dias: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  dia: {
    minWidth: 48,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  diaMarcado: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  acoes: { flexDirection: 'row', gap: espaco.sm, flexWrap: 'wrap' },
  modelos: { gap: espaco.sm },
  modelo: {
    padding: espaco.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    gap: 2,
  },
  modeloTitulo: { fontWeight: '700' },
  modeloCabeca: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm },
}));
