import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Opcoes, Tela, Texto } from '../../../componentes';
import { baixarRelatorioPdf, periodoDoMes, reais, valorDigitado } from '../../../financeiro/relatorio';
import { hojeBrasilia } from '../../../pets/datas';
import { mensagemDaApi } from '../../../pets/erros';
import { dataBr, dataIso, mascararData } from '../../../pets/formulario';
import { cores, espaco } from '../../../tema/tokens';

type Despesa = components['schemas']['Despesa'];
type Categoria = { id?: string; nome?: string; descricao?: string };
type Relatorio = components['schemas']['RelatorioDespesas'];
type Mes = '0' | '-1' | '-2';

/** Despesas do pet (UC-06, RN10) e relatório do mês com exportação em PDF (UC-07, RN11). */
export default function Despesas() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [hoje] = useState(() => hojeBrasilia());
  const [mes, setMes] = useState<Mes>('0');
  const periodo = periodoDoMes(hoje, Number(mes));
  const [despesas, setDespesas] = useState<Despesa[] | null>(null);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formulario, setFormulario] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(dataBr(hoje));
  const [categoriaId, setCategoriaId] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [baixando, setBaixando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    void api.GET('/categorias-despesa').then(({ data: c }) => setCategorias(c ?? []));
  }, []);

  useEffect(() => {
    let ativo = true;
    const filtro = { de: periodo.de, ate: periodo.ate };
    void Promise.all([
      api.GET('/pets/{petId}/despesas', { params: { path: { petId }, query: filtro } }),
      api.GET('/relatorios/despesas', { params: { query: { ...filtro, petId } } }),
    ]).then(([d, r]) => {
      if (!ativo) return;
      setDespesas(d.data ?? []);
      // CT-07-02: mês sem despesas volta 404 e o resumo simplesmente não aparece.
      setRelatorio(r.data && typeof r.data === 'object' ? r.data : null);
    });
    return () => {
      ativo = false;
    };
  }, [petId, periodo.de, periodo.ate, versao]);

  async function salvar() {
    const v = valorDigitado(valor);
    const iso = dataIso(data);
    const encontrados: Record<string, string> = {
      ...(!descricao.trim() ? { descricao: 'Descreva a despesa.' } : {}),
      ...(v === null ? { valor: 'Informe o valor, por exemplo 89,90.' } : {}),
      ...(!iso ? { data: 'Informe a data como DD/MM/AAAA.' } : iso > hoje ? { data: 'A despesa não pode ser futura.' } : {}),
      ...(!categoriaId ? { categoria: 'Escolha uma categoria.' } : {}),
    };
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0 || v === null || !iso) return;
    const { error } = await api.POST('/pets/{petId}/despesas', {
      params: { path: { petId } },
      body: { descricao: descricao.trim(), valor: v, data: iso, categoriaId },
    });
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Despesa não registrada', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: 'Despesa registrada' });
    setFormulario(false);
    setDescricao('');
    setValor('');
    setVersao((n) => n + 1);
  }

  async function baixar() {
    setBaixando(true);
    try {
      await baixarRelatorioPdf({ de: periodo.de, ate: periodo.ate, petId });
    } catch {
      setAviso({ tipo: 'erro', titulo: 'Não foi possível baixar o PDF' });
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Tela titulo="Despesas" subtitulo="Gastos com o pet e o resumo do mês.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      <Opcoes<Mes>
        rotulo="Mês"
        opcoes={(['0', '-1', '-2'] as Mes[]).map((m) => ({ valor: m, rotulo: periodoDoMes(hoje, Number(m)).rotulo }))}
        valor={mes}
        aoMudar={(m) => {
          setMes(m);
          setDespesas(null);
        }}
      />

      {!formulario && <Botao titulo="Registrar despesa" larguraTotal onPress={() => setFormulario(true)} />}
      {formulario && (
        <Cartao titulo="Nova despesa">
          <Campo rotulo="Descrição" value={descricao} onChangeText={setDescricao} erro={erros.descricao} />
          <Campo rotulo="Valor (R$)" keyboardType="decimal-pad" value={valor} onChangeText={setValor} erro={erros.valor} />
          <Campo
            rotulo="Data (DD/MM/AAAA)"
            keyboardType="number-pad"
            value={data}
            onChangeText={(t) => setData(mascararData(t))}
            erro={erros.data}
          />
          <Texto variante="legenda" negrito>
            Categoria
          </Texto>
          <Opcoes rotulo="Categoria" opcoes={categorias.map((c) => ({ valor: c.id ?? '', rotulo: c.nome ?? '' }))} valor={categoriaId} aoMudar={setCategoriaId} />
          {erros.categoria && <Texto cor={cores.erro}>{erros.categoria}</Texto>}
          <Botao titulo="Salvar despesa" larguraTotal onPress={() => void salvar()} />
          <Botao titulo="Cancelar" variante="texto" onPress={() => setFormulario(false)} />
        </Cartao>
      )}

      {relatorio && (
        <Cartao titulo={`Total de ${periodo.rotulo}: ${reais(relatorio.total)}`}>
          {relatorio.porCategoria.map((c) => (
            <View key={c.categoria} style={estilos.linha}>
              <Texto>
                {c.categoria} ({c.quantidade})
              </Texto>
              <Texto negrito>{reais(c.total ?? 0)}</Texto>
            </View>
          ))}
          <Botao titulo="Baixar relatório em PDF" variante="secundaria" carregando={baixando} onPress={() => void baixar()} />
        </Cartao>
      )}

      {despesas === null ? (
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando as despesas" />
      ) : despesas.length === 0 ? (
        <Texto cor={cores.textoSecundario}>Não há despesas em {periodo.rotulo}.</Texto>
      ) : (
        despesas.map((d) => (
          <View key={d.id} style={estilos.despesa} accessible>
            <View style={estilos.linha}>
              <Texto>{d.descricao}</Texto>
              <Texto negrito>{reais(d.valor)}</Texto>
            </View>
            <Texto variante="legenda" cor={cores.textoSecundario}>
              {dataBr(d.data)} · {d.categoria}
            </Texto>
          </View>
        ))
      )}
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between', gap: espaco.md },
  despesa: { gap: espaco.xs, paddingVertical: espaco.sm, borderBottomWidth: 1, borderBottomColor: cores.borda, alignSelf: 'stretch' },
});
