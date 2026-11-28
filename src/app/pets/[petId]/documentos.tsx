import { getDocumentAsync } from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Opcoes, Tela, Texto } from '../../../componentes';
import { mensagemDaApi } from '../../../pets/erros';
import { dataBr } from '../../../pets/formulario';
import { abrirDocumento } from '../../../saude/arquivos';
import { enviarDocumento } from '../../../saude/envio';
import type { ArquivoEscolhido } from '../../../saude/envio';
import { cores, espaco } from '../../../tema/tokens';

type Documento = components['schemas']['Documento'];
type Tipo = components['schemas']['TipoDocumento'];

const TIPOS: { valor: Tipo; rotulo: string }[] = [
  { valor: 'LAUDO', rotulo: 'Laudo' },
  { valor: 'RECEITA', rotulo: 'Receita' },
  { valor: 'ATESTADO', rotulo: 'Atestado' },
  { valor: 'CARTEIRA_VACINACAO', rotulo: 'Carteira de vacinação' },
  { valor: 'RG_ANIMAL', rotulo: 'RG animal' },
  { valor: 'PEDIGREE', rotulo: 'Pedigree' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];
const rotuloTipo = (t: string) => TIPOS.find((x) => x.valor === t)?.rotulo ?? t;

/** Documentos do pet (UC-34, RN15): envio de PDF ou foto e download por URL assinada. */
export default function Documentos() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [lista, setLista] = useState<Documento[] | null>(null);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<Tipo>('LAUDO');
  const [arquivo, setArquivo] = useState<ArquivoEscolhido | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [excluindo, setExcluindo] = useState<Documento | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.GET('/pets/{petId}/documentos', { params: { path: { petId } } }).then(({ data }) => {
      if (ativo) setLista(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  async function escolher() {
    const r = await getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setArquivo({ uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType });
    if (!titulo) setTitulo(a.name.replace(/\.[^.]+$/, ''));
  }

  async function enviar() {
    if (!arquivo || !titulo.trim()) {
      setAviso({ tipo: 'erro', titulo: !arquivo ? 'Escolha o arquivo.' : 'Dê um título ao documento.' });
      return;
    }
    setEnviando(true);
    const problema = await enviarDocumento(petId, { titulo, tipo, arquivo });
    setEnviando(false);
    if (problema) {
      setAviso({ tipo: 'erro', titulo: 'Documento não enviado', mensagem: problema });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: 'Documento enviado' });
    setArquivo(null);
    setTitulo('');
    setVersao((n) => n + 1);
  }

  async function abrir(d: Documento) {
    if (!(await abrirDocumento(d.id))) setAviso({ tipo: 'erro', titulo: 'Não foi possível abrir o documento' });
  }

  async function excluir() {
    if (!excluindo) return;
    const { error } = await api.DELETE('/documentos/{documentoId}', { params: { path: { documentoId: excluindo.id } } });
    setExcluindo(null);
    setAviso(error ? { tipo: 'erro', titulo: 'Documento mantido', mensagem: mensagemDaApi(error) } : { tipo: 'sucesso', titulo: 'Documento excluído' });
    setVersao((n) => n + 1);
  }

  return (
    <Tela titulo="Documentos" subtitulo="Laudos, receitas e outros arquivos do pet.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {excluindo && (
        <>
          <Alerta tipo="alerta" titulo={`Excluir "${excluindo.titulo}"?`} />
          <View style={estilos.acoes}>
            <Botao titulo="Excluir" variante="perigo" onPress={() => void excluir()} />
            <Botao titulo="Cancelar" variante="texto" onPress={() => setExcluindo(null)} />
          </View>
        </>
      )}

      <Cartao titulo="Enviar documento" subtitulo="PDF ou foto, até 10 MB.">
        <Botao
          titulo={arquivo ? `Arquivo: ${arquivo.name}` : 'Escolher arquivo'}
          variante="secundaria"
          onPress={() => void escolher()}
        />
        <Campo rotulo="Título" value={titulo} onChangeText={setTitulo} />
        <Texto variante="legenda" negrito>
          Tipo
        </Texto>
        <Opcoes<Tipo> rotulo="Tipo" opcoes={TIPOS} valor={tipo} aoMudar={setTipo} />
        <Botao titulo="Enviar" larguraTotal carregando={enviando} onPress={() => void enviar()} />
      </Cartao>

      {lista === null ? (
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando os documentos" />
      ) : lista.length === 0 ? (
        <Texto cor={cores.textoSecundario}>Nenhum documento enviado.</Texto>
      ) : (
        lista.map((d) => (
          <Cartao key={d.id} titulo={d.titulo} subtitulo={`${rotuloTipo(d.tipo)} · enviado em ${dataBr(d.dataUpload)}`}>
            <View style={estilos.acoes}>
              <Botao titulo="Abrir" variante="secundaria" accessibilityLabel={`Abrir ${d.titulo}`} onPress={() => void abrir(d)} />
              <Botao titulo="Excluir" variante="texto" accessibilityLabel={`Excluir ${d.titulo}`} onPress={() => setExcluindo(d)} />
            </View>
          </Cartao>
        ))
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
});
