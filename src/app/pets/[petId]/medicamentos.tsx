import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Opcoes, Tela, Texto } from '../../../componentes';
import { hojeBrasilia } from '../../../pets/datas';
import { mensagemDaApi } from '../../../pets/erros';
import { dataBr, mascararData } from '../../../pets/formulario';
import { INTERVALOS, VIAS, montarTratamento, resumoTratamento } from '../../../saude/tratamento';
import type { ValoresTratamento } from '../../../saude/tratamento';
import { mascararHora } from '../../../agenda/agenda';
import { cores, espaco } from '../../../tema/tokens';

type Tratamento = components['schemas']['Tratamento'];

/** Medicamentos do pet (UC-14, RN18): cada dose vira lembrete para os responsáveis. */
export default function Medicamentos() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [hoje] = useState(() => hojeBrasilia());
  const [lista, setLista] = useState<Tratamento[] | null>(null);
  const [formulario, setFormulario] = useState(false);
  const [v, setV] = useState<ValoresTratamento>({
    medicamento: '',
    dosagem: '',
    via: 'Oral',
    intervalo: '8',
    inicio: dataBr(hoje),
    fim: '',
    primeiraDose: '08:00',
    observacoes: '',
  });
  const [erros, setErros] = useState<Partial<Record<keyof ValoresTratamento, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [finalizando, setFinalizando] = useState<Tratamento | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);
  const mudar = (campo: keyof ValoresTratamento) => (valor: string) => setV((a) => ({ ...a, [campo]: valor }));

  useEffect(() => {
    let ativo = true;
    void api.GET('/pets/{petId}/tratamentos', { params: { path: { petId } } }).then(({ data }) => {
      if (ativo) setLista(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  async function salvar() {
    const montado = montarTratamento(v, hoje);
    if (!montado.ok) {
      setErros(montado.erros);
      return;
    }
    setErros({});
    setSalvando(true);
    const { data, error } = await api.POST('/pets/{petId}/tratamentos', {
      params: { path: { petId } },
      body: montado.corpo,
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Medicamento não salvo', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({
      tipo: 'sucesso',
      titulo: 'Medicamento salvo',
      mensagem: `${data?.lembretesAgendados ?? 0} lembretes de dose agendados para os responsáveis.`,
    });
    setFormulario(false);
    setV((a) => ({ ...a, medicamento: '', dosagem: '', fim: '', observacoes: '' }));
    setVersao((n) => n + 1);
  }

  async function finalizar() {
    if (!finalizando?.id) return;
    const { error } = await api.POST('/tratamentos/{tratamentoId}/finalizacao', {
      params: { path: { tratamentoId: finalizando.id } },
    });
    setFinalizando(null);
    setAviso(
      error
        ? { tipo: 'erro', titulo: 'Tratamento não finalizado', mensagem: mensagemDaApi(error) }
        : { tipo: 'sucesso', titulo: 'Tratamento finalizado', mensagem: 'Os lembretes que ainda não saíram foram cancelados.' },
    );
    setVersao((n) => n + 1);
  }

  const ativos = (lista ?? []).filter((t) => t.status === 'ATIVO');
  const anteriores = (lista ?? []).filter((t) => t.status !== 'ATIVO');

  return (
    <Tela titulo="Medicamentos" subtitulo="Os responsáveis recebem um lembrete em cada dose.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {finalizando && (
        <>
          <Alerta
            tipo="alerta"
            titulo={`Finalizar ${finalizando.medicamento} hoje?`}
            mensagem="Os lembretes das próximas doses são cancelados."
          />
          <View style={estilos.acoes}>
            <Botao titulo="Finalizar" variante="perigo" onPress={() => void finalizar()} />
            <Botao titulo="Cancelar" variante="texto" onPress={() => setFinalizando(null)} />
          </View>
        </>
      )}

      {!formulario && <Botao titulo="Novo medicamento" larguraTotal onPress={() => setFormulario(true)} />}
      {formulario && (
        <Cartao titulo="Novo medicamento">
          <Campo rotulo="Medicamento" value={v.medicamento} onChangeText={mudar('medicamento')} erro={erros.medicamento} />
          <Campo rotulo="Dose" value={v.dosagem} onChangeText={mudar('dosagem')} erro={erros.dosagem} />
          <Texto variante="legenda" negrito>
            Como é dado
          </Texto>
          <Opcoes rotulo="Como é dado" opcoes={VIAS.map((x) => ({ valor: x, rotulo: x }))} valor={v.via} aoMudar={mudar('via')} />
          <Texto variante="legenda" negrito>
            De quantas em quantas horas
          </Texto>
          <Opcoes
            rotulo="Intervalo"
            opcoes={INTERVALOS.map((x) => ({ valor: x, rotulo: x === '24' ? '1 vez por dia' : `${x} em ${x} h` }))}
            valor={v.intervalo}
            aoMudar={mudar('intervalo')}
          />
          {erros.intervalo && <Texto cor={cores.erro}>{erros.intervalo}</Texto>}
          <Campo
            rotulo="Início (DD/MM/AAAA)"
            keyboardType="number-pad"
            value={v.inicio}
            onChangeText={(t) => mudar('inicio')(mascararData(t))}
            erro={erros.inicio}
          />
          <Campo
            rotulo="Fim (opcional)"
            keyboardType="number-pad"
            ajuda="Sem fim, os lembretes cobrem os próximos 30 dias."
            value={v.fim}
            onChangeText={(t) => mudar('fim')(mascararData(t))}
            erro={erros.fim}
          />
          <Campo
            rotulo="Primeira dose (HH:MM)"
            keyboardType="number-pad"
            value={v.primeiraDose}
            onChangeText={(t) => mudar('primeiraDose')(mascararHora(t))}
            erro={erros.primeiraDose}
          />
          <Campo rotulo="Observações (opcional)" value={v.observacoes} onChangeText={mudar('observacoes')} multiline />
          <Botao titulo="Salvar medicamento" larguraTotal carregando={salvando} onPress={() => void salvar()} />
          <Botao titulo="Cancelar" variante="texto" onPress={() => setFormulario(false)} />
        </Cartao>
      )}

      {lista === null ? (
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando os medicamentos" />
      ) : (
        <>
          <Texto variante="titulo2">Em uso</Texto>
          {ativos.length === 0 && <Texto cor={cores.textoSecundario}>Nenhum medicamento em uso.</Texto>}
          {ativos.map((t) => (
            <Cartao key={t.id} titulo={`${t.medicamento} · ${t.dosagem}`} subtitulo={resumoTratamento(t)}>
              <Texto variante="legenda">{t.viaAdministracao}</Texto>
              {t.observacoes ? <Texto>{t.observacoes}</Texto> : null}
              <Botao
                titulo="Finalizar"
                variante="texto"
                accessibilityLabel={`Finalizar ${t.medicamento}`}
                onPress={() => setFinalizando(t)}
              />
            </Cartao>
          ))}
          {anteriores.length > 0 && <Texto variante="titulo2">Anteriores</Texto>}
          {anteriores.map((t) => (
            <Cartao key={t.id} titulo={`${t.medicamento} · ${t.dosagem}`} subtitulo={resumoTratamento(t)} />
          ))}
        </>
      )}
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row', gap: espaco.sm },
});
