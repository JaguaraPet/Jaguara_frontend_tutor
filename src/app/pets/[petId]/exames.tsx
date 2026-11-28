import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Opcoes, Tela, Texto } from '../../../componentes';
import { hojeBrasilia } from '../../../pets/datas';
import { mensagemDaApi } from '../../../pets/erros';
import { dataBr, dataIso, mascararData } from '../../../pets/formulario';
import { abrirDocumento } from '../../../saude/arquivos';
import { cores } from '../../../tema/tokens';

type Exame = components['schemas']['Exame'];
type Documento = components['schemas']['Documento'];

/** Exames do pet (UC-36): histórico e registro com laudo dos documentos do pet. */
export default function Exames() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [hoje] = useState(() => hojeBrasilia());
  const [lista, setLista] = useState<Exame[] | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [formulario, setFormulario] = useState(false);
  const [tipo, setTipo] = useState('');
  const [data, setData] = useState(dataBr(hoje));
  const [laboratorio, setLaboratorio] = useState('');
  const [resultado, setResultado] = useState('');
  const [documentoId, setDocumentoId] = useState('');
  const [erros, setErros] = useState<{ tipo?: string; data?: string }>({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    const caminho = { params: { path: { petId } } };
    void Promise.all([api.GET('/pets/{petId}/exames', caminho), api.GET('/pets/{petId}/documentos', caminho)]).then(
      ([e, d]) => {
        if (!ativo) return;
        setLista(e.data ?? []);
        setDocumentos(d.data ?? []);
      },
    );
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  async function salvar() {
    const iso = dataIso(data);
    const encontrados = {
      ...(!tipo.trim() ? { tipo: 'Informe o exame, por exemplo "Hemograma".' } : {}),
      ...(!iso ? { data: 'Informe a data como DD/MM/AAAA.' } : iso > hoje ? { data: 'A data não pode ser futura.' } : {}),
    };
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0 || !iso) return;
    setSalvando(true);
    const { error } = await api.POST('/pets/{petId}/exames', {
      params: { path: { petId } },
      body: {
        tipoExame: tipo.trim(),
        dataRealizacao: iso,
        ...(laboratorio.trim() ? { laboratorio: laboratorio.trim() } : {}),
        ...(resultado.trim() ? { resultado: resultado.trim() } : {}),
        ...(documentoId ? { documentoId } : {}),
      },
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Exame não registrado', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: 'Exame registrado' });
    setFormulario(false);
    setTipo('');
    setLaboratorio('');
    setResultado('');
    setDocumentoId('');
    setVersao((n) => n + 1);
  }

  async function verLaudo(exame: Exame) {
    if (!exame.documentoId || !(await abrirDocumento(exame.documentoId))) {
      setAviso({ tipo: 'erro', titulo: 'Não foi possível abrir o laudo' });
    }
  }

  return (
    <Tela titulo="Exames" subtitulo="Histórico clínico do pet.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {!formulario && <Botao titulo="Registrar exame" larguraTotal onPress={() => setFormulario(true)} />}
      {formulario && (
        <Cartao titulo="Novo exame">
          <Campo rotulo="Exame" value={tipo} onChangeText={setTipo} erro={erros.tipo} />
          <Campo
            rotulo="Data (DD/MM/AAAA)"
            keyboardType="number-pad"
            value={data}
            onChangeText={(t) => setData(mascararData(t))}
            erro={erros.data}
          />
          <Campo rotulo="Laboratório (opcional)" value={laboratorio} onChangeText={setLaboratorio} />
          <Campo rotulo="Resultado (opcional)" value={resultado} onChangeText={setResultado} multiline />
          <Texto variante="legenda" negrito>
            Laudo
          </Texto>
          {documentos.length === 0 ? (
            <Texto variante="legenda" cor={cores.textoSecundario}>
              Envie o arquivo em Documentos para anexar como laudo.
            </Texto>
          ) : (
            <Opcoes
              rotulo="Laudo"
              opcoes={[{ valor: '', rotulo: 'Sem laudo' }, ...documentos.map((d) => ({ valor: d.id, rotulo: d.titulo }))]}
              valor={documentoId}
              aoMudar={setDocumentoId}
            />
          )}
          <Botao titulo="Salvar exame" larguraTotal carregando={salvando} onPress={() => void salvar()} />
          <Botao titulo="Cancelar" variante="texto" onPress={() => setFormulario(false)} />
        </Cartao>
      )}

      {lista === null ? (
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando os exames" />
      ) : lista.length === 0 ? (
        <Texto cor={cores.textoSecundario}>Nenhum exame registrado.</Texto>
      ) : (
        lista.map((e) => (
          <Cartao
            key={e.id}
            titulo={e.tipoExame}
            subtitulo={[dataBr(e.dataRealizacao), e.laboratorio].filter(Boolean).join(' · ')}
          >
            {e.resultado ? <Texto>{e.resultado}</Texto> : null}
            {e.temArquivo && e.documentoId && (
              <Botao
                titulo="Ver laudo"
                variante="texto"
                accessibilityLabel={`Ver laudo de ${e.tipoExame}`}
                onPress={() => void verLaudo(e)}
              />
            )}
          </Cartao>
        ))
      )}
    </Tela>
  );
}
