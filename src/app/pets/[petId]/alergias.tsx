import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Opcoes, Tela, Texto } from '../../../componentes';
import { hojeBrasilia } from '../../../pets/datas';
import { mensagemDaApi } from '../../../pets/erros';
import { dataBr, dataIso, mascararData } from '../../../pets/formulario';
import { GRAVIDADE, TIPO_ALERGIA } from '../../../pets/perfil';
import { cores, espaco } from '../../../tema/tokens';

type Alergia = components['schemas']['Alergia'];
type Entrada = components['schemas']['AlergiaEntrada'];
type Tipo = Entrada['tipo'];
type Gravidade = Entrada['gravidade'];
type Aviso = { tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string };

const TIPOS = Object.keys(TIPO_ALERGIA) as Tipo[];
const GRAVIDADES: Gravidade[] = ['LEVE', 'MODERADA', 'GRAVE'];
const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Alergias e restrições do pet (UC-37): as graves aparecem em destaque no perfil (CT-37-01). */
export default function Alergias() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [hoje] = useState(() => hojeBrasilia());
  const [lista, setLista] = useState<Alergia[] | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [tipo, setTipo] = useState<Tipo>('ALERGIA');
  const [descricao, setDescricao] = useState('');
  const [gravidade, setGravidade] = useState<Gravidade>('LEVE');
  const [data, setData] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erros, setErros] = useState<{ descricao?: string; data?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState<string | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.GET('/pets/{petId}/alergias', { params: { path: { petId } } }).then(({ data: d }) => {
      if (ativo) setLista(d ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  function abrir(a?: Alergia) {
    setEditando(a?.id ?? 'nova');
    setTipo(a?.tipo ?? 'ALERGIA');
    setDescricao(a?.descricao ?? '');
    setGravidade(a?.gravidade ?? 'LEVE');
    setData(a?.dataIdentificacao ? dataBr(a.dataIdentificacao) : '');
    setObservacoes(a?.observacoes ?? '');
    setErros({});
    setAviso(null);
  }

  async function salvar() {
    const iso = data ? dataIso(data) : null;
    const encontrados = {
      ...(!descricao.trim() ? { descricao: 'Diga a que o pet tem alergia ou restrição, por exemplo "Dipirona".' } : {}),
      ...(data && !iso ? { data: 'Informe a data como DD/MM/AAAA.' } : iso && iso > hoje ? { data: 'A data não pode ser futura.' } : {}),
    };
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    const body: Entrada = {
      tipo,
      descricao: descricao.trim(),
      gravidade,
      ...(iso ? { dataIdentificacao: iso } : {}),
      ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}),
    };
    setSalvando(true);
    const { error } =
      editando && editando !== 'nova'
        ? await api.PATCH('/alergias/{alergiaId}', { params: { path: { alergiaId: editando } }, body })
        : await api.POST('/pets/{petId}/alergias', { params: { path: { petId } }, body });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Alergia não salva', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({
      tipo: 'sucesso',
      titulo: editando === 'nova' ? 'Alergia registrada' : 'Alergia alterada',
      mensagem: gravidade === 'GRAVE' ? 'Ela aparece em destaque no perfil do pet.' : undefined,
    });
    setEditando(null);
    setVersao((v) => v + 1);
  }

  async function confirmarExclusao(a: Alergia) {
    const { error } = await api.DELETE('/alergias/{alergiaId}', { params: { path: { alergiaId: a.id! } } });
    setExcluir(null);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Alergia não excluída', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: `${a.descricao} excluída` });
    setVersao((v) => v + 1);
  }

  return (
    <Tela titulo="Alergias e restrições" subtitulo="As graves aparecem em destaque no perfil do pet.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {!editando && <Botao titulo="Registrar alergia ou restrição" larguraTotal onPress={() => abrir()} />}
      {editando && (
        <Cartao titulo={editando === 'nova' ? 'Nova alergia ou restrição' : 'Alterar'}>
          <Opcoes rotulo="Tipo" opcoes={TIPOS.map((t) => ({ valor: t, rotulo: TIPO_ALERGIA[t]! }))} valor={tipo} aoMudar={setTipo} />
          <Campo rotulo="A que o pet reage" value={descricao} onChangeText={setDescricao} erro={erros.descricao} />
          <Opcoes
            rotulo="Gravidade"
            opcoes={GRAVIDADES.map((g) => ({ valor: g, rotulo: maiuscula(GRAVIDADE[g]!) }))}
            valor={gravidade}
            aoMudar={setGravidade}
          />
          <Campo
            rotulo="Identificada em (opcional, DD/MM/AAAA)"
            keyboardType="number-pad"
            value={data}
            onChangeText={(t) => setData(mascararData(t))}
            erro={erros.data}
          />
          <Campo rotulo="Observações (opcional)" value={observacoes} onChangeText={setObservacoes} multiline />
          <Botao titulo="Salvar" larguraTotal carregando={salvando} onPress={() => void salvar()} />
          <Botao titulo="Cancelar" variante="texto" onPress={() => setEditando(null)} />
        </Cartao>
      )}

      {lista === null ? (
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando as alergias" />
      ) : lista.length === 0 ? (
        <Texto cor={cores.textoSecundario}>Nenhuma alergia ou restrição registrada.</Texto>
      ) : (
        lista.map((a) => (
          <Cartao
            key={a.id}
            titulo={`${TIPO_ALERGIA[a.tipo]}: ${a.descricao}`}
            subtitulo={[maiuscula(GRAVIDADE[a.gravidade] ?? ''), a.dataIdentificacao ? `desde ${dataBr(a.dataIdentificacao)}` : null]
              .filter(Boolean)
              .join(' · ')}
          >
            {a.destaque && (
              <Texto negrito cor={cores.erro}>
                Em destaque no perfil
              </Texto>
            )}
            {a.observacoes ? <Texto variante="legenda">{a.observacoes}</Texto> : null}
            {excluir === a.id ? (
              <View style={estilos.acoes}>
                <Botao titulo="Confirmar exclusão" variante="perigo" onPress={() => void confirmarExclusao(a)} />
                <Botao titulo="Manter" variante="texto" onPress={() => setExcluir(null)} />
              </View>
            ) : (
              <View style={estilos.acoes}>
                <Botao titulo="Alterar" variante="texto" accessibilityLabel={`Alterar ${a.descricao}`} onPress={() => abrir(a)} />
                <Botao titulo="Excluir" variante="texto" accessibilityLabel={`Excluir ${a.descricao}`} onPress={() => setExcluir(a.id!)} />
              </View>
            )}
          </Cartao>
        ))
      )}
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
});
