import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { mascararHora } from '../../../agenda/agenda';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Tela, Texto } from '../../../componentes';
import { hojeBrasilia } from '../../../pets/datas';
import { mensagemDaApi } from '../../../pets/erros';
import { cores, espaco, raio } from '../../../tema/tokens';
import { criarEstilos } from '../../../tema/estilos';

type Plano = components['schemas']['PlanoAlimentar'];
type Resumo = components['schemas']['ResumoAlimentar'] & {
  refeicoes?: components['schemas']['Refeicao'][];
};
type Aviso = { tipo: 'sucesso' | 'erro' | 'alerta'; titulo: string; mensagem?: string };

const gramas = (texto: string) => {
  const n = Number(texto.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const hora = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';
const agoraHhMm = () =>
  new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

/** Alimentação do pet (UC-08, RN12): plano com meta e limite diários e as refeições do dia. */
export default function Alimentacao() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [hoje] = useState(() => hojeBrasilia());
  const [plano, setPlano] = useState<Plano | null | undefined>(undefined);
  const [dia, setDia] = useState<Resumo | null>(null);
  const [editandoPlano, setEditandoPlano] = useState(false);
  const [p, setP] = useState({ alimento: '', meta: '', limite: '', refeicoes: '2' });
  const [r, setR] = useState({ alimento: '', quantidade: '', hora: agoraHhMm(), observacao: '' });
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    const caminho = { params: { path: { petId } } };
    void Promise.all([
      api.GET('/pets/{petId}/plano-alimentar', caminho),
      api.GET('/pets/{petId}/refeicoes', { params: { path: { petId }, query: { data: hoje } } }),
    ]).then(([pl, rf]) => {
      if (!ativo) return;
      const atual = pl.data?.plano ?? null;
      setPlano(atual);
      setDia(rf.data ?? null);
      if (atual) setR((x) => ({ ...x, alimento: x.alimento || atual.alimento || '' }));
    });
    return () => {
      ativo = false;
    };
  }, [petId, hoje, versao]);

  function abrirPlano() {
    setP({
      alimento: plano?.alimento ?? '',
      meta: plano?.metaDiariaGramas ? String(plano.metaDiariaGramas) : '',
      limite: plano?.limiteDiarioGramas ? String(plano.limiteDiarioGramas) : '',
      refeicoes: String(plano?.refeicoesPorDia ?? 2),
    });
    setEditandoPlano(true);
  }

  async function salvarPlano() {
    const meta = gramas(p.meta);
    const limite = p.limite ? gramas(p.limite) : null;
    const refeicoes = Number(p.refeicoes);
    if (!p.alimento.trim() || !meta || (p.limite && !limite) || !Number.isInteger(refeicoes) || refeicoes < 1 || refeicoes > 12) {
      setAviso({ tipo: 'erro', titulo: 'Confira o plano', mensagem: 'Informe o alimento, a meta em gramas e de 1 a 12 refeições.' });
      return;
    }
    if (limite && limite < meta) {
      setAviso({ tipo: 'erro', titulo: 'Confira o plano', mensagem: 'O limite diário não pode ser menor que a meta.' });
      return;
    }
    const { error } = await api.PUT('/pets/{petId}/plano-alimentar', {
      params: { path: { petId } },
      body: { alimento: p.alimento.trim(), metaDiariaGramas: meta, refeicoesPorDia: refeicoes, ...(limite ? { limiteDiarioGramas: limite } : {}) },
    });
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Plano não salvo', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: 'Plano salvo' });
    setEditandoPlano(false);
    setVersao((v) => v + 1);
  }

  async function registrar() {
    const quantidade = gramas(r.quantidade);
    if (!r.alimento.trim() || !quantidade || !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.hora)) {
      setAviso({ tipo: 'erro', titulo: 'Confira a refeição', mensagem: 'Informe o alimento, a quantidade em gramas e a hora (HH:MM).' });
      return;
    }
    const { data, error } = await api.POST('/pets/{petId}/refeicoes', {
      params: { path: { petId } },
      body: {
        alimento: r.alimento.trim(),
        quantidadeGramas: quantidade,
        dataHora: new Date(`${hoje}T${r.hora}:00-03:00`).toISOString(),
        ...(r.observacao.trim() ? { observacao: r.observacao.trim() } : {}),
      },
    });
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Refeição não registrada', mensagem: mensagemDaApi(error) });
      return;
    }
    // CT-08-02: a refeição entra, mas o tutor é avisado do limite passado (RN12).
    setAviso(
      data?.limiteExcedido
        ? {
            tipo: 'alerta',
            titulo: 'Limite diário excedido',
            mensagem: `O pet já comeu ${data.consumoDoDia} g hoje; o limite é ${data.limiteDiarioGramas} g.`,
          }
        : { tipo: 'sucesso', titulo: 'Refeição registrada' },
    );
    setR((x) => ({ ...x, quantidade: '', observacao: '', hora: agoraHhMm() }));
    setVersao((v) => v + 1);
  }

  if (plano === undefined) {
    return (
      <Tela titulo="Alimentação">
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando a alimentação" />
      </Tela>
    );
  }

  const consumo = dia?.consumoDoDia ?? 0;
  const meta = plano?.metaDiariaGramas ?? 0;
  const proporcao = meta ? Math.min(1, consumo / meta) : 0;

  return (
    <Tela titulo="Alimentação" subtitulo="Plano e refeições de hoje.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}

      {plano && !editandoPlano && (
        <Cartao
          titulo={`Hoje: ${consumo} g de ${meta} g`}
          subtitulo={`${plano.alimento} · ${plano.refeicoesPorDia} refeições por dia${plano.limiteDiarioGramas ? ` · limite ${plano.limiteDiarioGramas} g` : ''}`}
        >
          <View
            style={estilos.trilho}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Consumo do dia"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(proporcao * 100) }}
          >
            <View
              style={[
                estilos.barra,
                { width: `${proporcao * 100}%`, backgroundColor: dia?.limiteExcedido ? cores.erro : cores.secundaria },
              ]}
            />
          </View>
          <Botao titulo="Alterar plano" variante="texto" onPress={abrirPlano} />
        </Cartao>
      )}
      {!plano && !editandoPlano && (
        <Cartao titulo="Sem plano alimentar" subtitulo="Defina a meta diária para acompanhar o consumo.">
          <Botao titulo="Criar plano" onPress={abrirPlano} />
        </Cartao>
      )}
      {editandoPlano && (
        <Cartao titulo="Plano alimentar">
          <Campo rotulo="Alimento" value={p.alimento} onChangeText={(t) => setP({ ...p, alimento: t })} />
          <Campo rotulo="Meta diária (g)" keyboardType="decimal-pad" value={p.meta} onChangeText={(t) => setP({ ...p, meta: t })} />
          <Campo
            rotulo="Limite diário (g, opcional)"
            keyboardType="decimal-pad"
            value={p.limite}
            onChangeText={(t) => setP({ ...p, limite: t })}
          />
          <Campo rotulo="Refeições por dia" keyboardType="number-pad" value={p.refeicoes} onChangeText={(t) => setP({ ...p, refeicoes: t })} />
          <Botao titulo="Salvar plano" onPress={() => void salvarPlano()} />
          <Botao titulo="Cancelar" variante="texto" onPress={() => setEditandoPlano(false)} />
        </Cartao>
      )}

      <Cartao titulo="Registrar refeição">
        <Campo rotulo="Alimento da refeição" value={r.alimento} onChangeText={(t) => setR({ ...r, alimento: t })} />
        <Campo rotulo="Quantidade (g)" keyboardType="decimal-pad" value={r.quantidade} onChangeText={(t) => setR({ ...r, quantidade: t })} />
        <Campo rotulo="Hora (HH:MM)" keyboardType="number-pad" value={r.hora} onChangeText={(t) => setR({ ...r, hora: mascararHora(t) })} />
        <Campo rotulo="Observação (opcional)" value={r.observacao} onChangeText={(t) => setR({ ...r, observacao: t })} />
        <Botao titulo="Registrar" onPress={() => void registrar()} />
      </Cartao>

      <Texto variante="titulo2">Refeições de hoje</Texto>
      {(dia?.refeicoes ?? []).length === 0 ? (
        <Texto cor={cores.textoSecundario}>Nenhuma refeição registrada hoje.</Texto>
      ) : (
        dia!.refeicoes!.map((x) => (
          <View key={x.id} style={estilos.refeicao}>
            <Texto>
              {hora(x.dataHora)} · {x.alimento}
            </Texto>
            <Texto negrito>{x.quantidadeGramas} g</Texto>
          </View>
        ))
      )}
    </Tela>
  );
}

const estilos = criarEstilos(() => ({
  trilho: { height: 12, borderRadius: raio.padrao, backgroundColor: cores.desabilitado, overflow: 'hidden' },
  barra: { height: '100%' },
  refeicao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: espaco.sm,
    borderBottomWidth: 1,
    borderBottomColor: cores.borda,
    alignSelf: 'stretch',
  },
}));
