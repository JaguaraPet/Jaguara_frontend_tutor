import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import { shareAsync } from 'expo-sharing';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Alerta, Botao, Campo, Cartao, Tela, Texto } from '../componentes';
import { mensagemDaApi } from '../pets/erros';
import { sessao } from '../sessao/sessao';
import { cores, espaco } from '../tema/tokens';

type Consentimento = components['schemas']['Consentimento'];
type Aviso = { tipo: 'sucesso' | 'erro' | 'alerta'; titulo: string; mensagem?: string };

const dataBr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

/** Privacidade e consentimentos (UC-46, LGPD): termos, exportação e exclusão da conta. */
export default function Privacidade() {
  const [lista, setLista] = useState<Consentimento[] | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [exportando, setExportando] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const [senha, setSenha] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    void api.GET('/privacidade/consentimentos').then(({ data }) => setLista(data ?? []));
  }, [versao]);

  async function alternar(c: Consentimento, aceito: boolean) {
    const { error } = await api.PUT('/privacidade/consentimentos', { body: [{ termoId: c.termoId!, aceito }] });
    if (error) {
      // CT-46-02: termo obrigatório não sai sem excluir a conta.
      setAviso({
        tipo: 'alerta',
        titulo: 'Este termo é necessário para usar o Jaguara',
        mensagem: `${mensagemDaApi(error)} Se não quiser mais, você pode excluir a conta abaixo.`,
      });
      setExcluir(true);
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: aceito ? 'Consentimento registrado' : 'Consentimento revogado' });
    setVersao((v) => v + 1);
  }

  async function exportar() {
    setExportando(true);
    try {
      const { data, error } = await api.GET('/privacidade/exportacao');
      if (error || !data) throw new Error('exportação');
      const arquivo = new File(Paths.cache, 'meus-dados-jaguara.json');
      if (arquivo.exists) arquivo.delete();
      arquivo.create();
      arquivo.write(JSON.stringify(data, null, 2));
      await shareAsync(arquivo.uri, { mimeType: 'application/json', dialogTitle: 'Meus dados do Jaguara' });
    } catch {
      setAviso({ tipo: 'erro', titulo: 'Não foi possível exportar agora' });
    } finally {
      setExportando(false);
    }
  }

  async function excluirConta() {
    setExcluindo(true);
    const { error } = await api.POST('/privacidade/solicitacoes', { body: { tipo: 'EXCLUSAO_DADOS', senha } });
    setExcluindo(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Conta não excluída', mensagem: mensagemDaApi(error) });
      return;
    }
    await sessao.sair();
    router.replace('/boas-vindas');
  }

  return (
    <Tela titulo="Privacidade" subtitulo="Seus dados e consentimentos (LGPD).">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      <Texto variante="titulo2">Termos e consentimentos</Texto>
      {lista === null ? (
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando os consentimentos" />
      ) : (
        lista.map((c) => (
          <Cartao key={c.termoId} titulo={c.titulo} subtitulo={`Versão ${c.versao}${c.dataAceite ? ` · aceito em ${dataBr(c.dataAceite)}` : ''}`}>
            <View style={estilos.linha}>
              <Texto variante="legenda" cor={cores.textoSecundario}>
                {c.obrigatorio ? 'Obrigatório para usar o app' : 'Opcional'}
              </Texto>
              <Switch
                accessibilityLabel={`Aceito: ${c.titulo}`}
                value={!!c.aceito}
                onValueChange={(v) => void alternar(c, v)}
                trackColor={{ true: cores.secundaria, false: cores.desabilitado }}
              />
            </View>
          </Cartao>
        ))
      )}

      <Cartao titulo="Meus dados" subtitulo="Conta, pets, saúde, despesas e agenda em um arquivo.">
        <Botao titulo="Exportar meus dados" variante="secundaria" carregando={exportando} onPress={() => void exportar()} />
      </Cartao>

      <Cartao titulo="Excluir conta" subtitulo="Seus dados são anonimizados; pets divididos ficam com o outro responsável.">
        {!excluir ? (
          <Botao titulo="Quero excluir minha conta" variante="texto" onPress={() => setExcluir(true)} />
        ) : (
          <>
            <Campo rotulo="Sua senha para confirmar" secureTextEntry value={senha} onChangeText={setSenha} />
            <View style={estilos.acoes}>
              <Botao titulo="Confirmar exclusão" variante="perigo" carregando={excluindo} disabled={!senha} onPress={() => void excluirConta()} />
              <Botao titulo="Cancelar" variante="texto" onPress={() => setExcluir(false)} />
            </View>
          </>
        )}
      </Cartao>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espaco.md },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
});
