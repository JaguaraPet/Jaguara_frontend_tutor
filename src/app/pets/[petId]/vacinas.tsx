import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Icone, Tela, Texto } from '../../../componentes';
import { hojeBrasilia } from '../../../pets/datas';
import { mensagemDaApi } from '../../../pets/erros';
import { dataBr, mascararData } from '../../../pets/formulario';
import { proximaDose } from '../../../pets/perfil';
import { montarVacina } from '../../../saude/vacina';
import type { ValoresVacina } from '../../../saude/vacina';
import { cores, coresSuaves, espaco } from '../../../tema/tokens';
import { criarEstilos } from '../../../tema/estilos';

type Vacina = components['schemas']['Vacinacao'];

const VAZIO: ValoresVacina = {
  nome: '',
  fabricante: '',
  lote: '',
  aplicacao: '',
  proximaDose: '',
  responsavel: '',
  observacoes: '',
};

/** Vacinação do pet (UC-12, UC-13): histórico válido em ordem de aplicação e registro. */
export default function Vacinas() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [hoje] = useState(() => hojeBrasilia());
  const [lista, setLista] = useState<Vacina[] | null>(null);
  const [formulario, setFormulario] = useState(false);
  const [v, setV] = useState<ValoresVacina>({ ...VAZIO, aplicacao: dataBr(hoje) });
  const [erros, setErros] = useState<Partial<Record<keyof ValoresVacina, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);
  const mudar = (campo: keyof ValoresVacina) => (valor: string) => setV((a) => ({ ...a, [campo]: valor }));

  useEffect(() => {
    let ativo = true;
    void api.GET('/pets/{petId}/vacinacoes', { params: { path: { petId } } }).then(({ data }) => {
      if (ativo) setLista(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  async function salvar() {
    const montado = montarVacina(v, hoje);
    if (!montado.ok) {
      setErros(montado.erros);
      return;
    }
    setErros({});
    setSalvando(true);
    const { error } = await api.POST('/pets/{petId}/vacinacoes', { params: { path: { petId } }, body: montado.corpo });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Vacina não registrada', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({
      tipo: 'sucesso',
      titulo: 'Vacina registrada',
      mensagem: montado.corpo.dataProximaDose
        ? 'Os responsáveis recebem um lembrete às 9h do dia anterior à próxima dose.'
        : undefined,
    });
    setFormulario(false);
    setV({ ...VAZIO, aplicacao: dataBr(hoje) });
    setVersao((n) => n + 1);
  }

  const proxima = proximaDose(lista ?? [], hoje);

  return (
    <Tela titulo="Vacinas" subtitulo="Histórico em ordem de aplicação.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {proxima && (
        <Alerta
          tipo="info"
          titulo={`Próxima dose: ${proxima.nomeVacina}`}
          mensagem={`Prevista para ${dataBr(proxima.data)}.`}
        />
      )}
      {!formulario && <Botao titulo="Registrar vacina" larguraTotal onPress={() => setFormulario(true)} />}
      {formulario && (
        <Cartao titulo="Nova vacinação">
          <Campo rotulo="Vacina" value={v.nome} onChangeText={mudar('nome')} erro={erros.nome} />
          <Campo
            rotulo="Data da aplicação (DD/MM/AAAA)"
            keyboardType="number-pad"
            value={v.aplicacao}
            onChangeText={(t) => mudar('aplicacao')(mascararData(t))}
            erro={erros.aplicacao}
          />
          <Campo
            rotulo="Quem aplicou"
            ajuda="Nome do veterinário ou da clínica."
            value={v.responsavel}
            onChangeText={mudar('responsavel')}
            erro={erros.responsavel}
          />
          <Campo
            rotulo="Próxima dose (opcional)"
            keyboardType="number-pad"
            value={v.proximaDose}
            onChangeText={(t) => mudar('proximaDose')(mascararData(t))}
            erro={erros.proximaDose}
          />
          <Campo rotulo="Fabricante (opcional)" value={v.fabricante} onChangeText={mudar('fabricante')} />
          <Campo rotulo="Lote (opcional)" value={v.lote} onChangeText={mudar('lote')} />
          <Campo rotulo="Observações (opcional)" value={v.observacoes} onChangeText={mudar('observacoes')} multiline />
          <Botao titulo="Salvar vacina" larguraTotal carregando={salvando} onPress={() => void salvar()} />
          <Botao titulo="Cancelar" variante="texto" onPress={() => setFormulario(false)} />
        </Cartao>
      )}

      {lista === null ? (
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando as vacinas" />
      ) : lista.length === 0 ? (
        <Texto cor={cores.textoSecundario}>Nenhuma vacina registrada.</Texto>
      ) : (
        lista.map((x) => (
          <Cartao
            key={x.id}
            titulo={x.nomeVacina}
            subtitulo={`Aplicada em ${dataBr(x.dataAplicacao)} por ${x.responsavelAplicacao}`}
          >
            {x.verificadaPor && (
              <View style={estilos.selo} accessibilityLabel={`Registrada pela ${x.verificadaPor}`}>
                <Icone nome="check-decagram" tamanho={16} cor={cores.secundaria} />
                <Texto variante="legenda" cor={cores.secundaria}>
                  Registrada pela {x.verificadaPor}
                </Texto>
              </View>
            )}
            {(x.fabricante || x.lote) && (
              <Texto variante="legenda">{[x.fabricante, x.lote && `lote ${x.lote}`].filter(Boolean).join(' · ')}</Texto>
            )}
            {x.dataProximaDose && <Texto>Próxima dose: {dataBr(x.dataProximaDose)}</Texto>}
            {x.observacoes ? <Texto variante="legenda">{x.observacoes}</Texto> : null}
          </Cartao>
        ))
      )}
    </Tela>
  );
}

const estilos = criarEstilos(() => ({
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: coresSuaves.info,
  },
}));
