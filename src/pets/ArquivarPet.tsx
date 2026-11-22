import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api } from '../api/cliente';
import { Alerta, Botao, Cartao } from '../componentes';
import { espaco } from '../tema/tokens';
import { mensagemDaApi } from './erros';

type Acao = 'arquivar' | 'excluir' | null;

/**
 * Arquivar ou excluir o pet (UC-04, RN08). Arquivar esconde o pet da lista de ativos sem apagar o
 * histórico; excluir só vale para pet sem histórico, e a recusa da API oferece o arquivamento (CT-04-02).
 */
export function ArquivarPet({ petId, nome }: { petId: string; nome: string }) {
  const [confirmar, setConfirmar] = useState<Acao>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ titulo: string; mensagem?: string } | null>(null);

  async function arquivar() {
    setEnviando(true);
    const { error } = await api.POST('/pets/{petId}/arquivamento', { params: { path: { petId } } });
    setEnviando(false);
    if (error) {
      setErro({ titulo: 'Pet não arquivado', mensagem: mensagemDaApi(error) });
      return;
    }
    router.replace('/pets');
  }

  async function excluir() {
    setEnviando(true);
    const { error, response } = await api.DELETE('/pets/{petId}', { params: { path: { petId } } });
    setEnviando(false);
    if (response.status === 409) {
      setErro({
        titulo: `${nome} tem histórico e não pode ser excluído`,
        mensagem: 'Arquive o pet: ele sai da lista de ativos e o histórico continua guardado.',
      });
      setConfirmar('arquivar');
      return;
    }
    if (error) {
      setErro({ titulo: 'Pet não excluído', mensagem: mensagemDaApi(error) });
      return;
    }
    router.replace('/pets');
  }

  return (
    <Cartao titulo="Arquivar ou excluir" subtitulo="O arquivamento guarda o histórico; a exclusão só vale para pet sem registros.">
      {erro && <Alerta tipo="alerta" titulo={erro.titulo} mensagem={erro.mensagem} />}
      {confirmar === null && (
        <View style={estilos.acoes}>
          <Botao titulo="Arquivar pet" variante="secundaria" onPress={() => setConfirmar('arquivar')} />
          <Botao titulo="Excluir pet" variante="texto" onPress={() => setConfirmar('excluir')} />
        </View>
      )}
      {confirmar !== null && (
        <View style={estilos.acoes}>
          <Botao
            titulo={confirmar === 'arquivar' ? `Arquivar ${nome}` : `Excluir ${nome}`}
            variante="perigo"
            carregando={enviando}
            onPress={() => void (confirmar === 'arquivar' ? arquivar() : excluir())}
          />
          <Botao
            titulo="Cancelar"
            variante="texto"
            onPress={() => {
              setConfirmar(null);
              setErro(null);
            }}
          />
        </View>
      )}
    </Cartao>
  );
}

/** Desfaz o arquivamento (só o responsável principal): o pet volta para a lista de ativos. */
export function DesarquivarPet({ petId, nome, aoDesarquivar }: { petId: string; nome: string; aoDesarquivar: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function desarquivar() {
    setEnviando(true);
    const { error } = await api.DELETE('/pets/{petId}/arquivamento', { params: { path: { petId } } });
    setEnviando(false);
    if (error) {
      setErro(mensagemDaApi(error));
      return;
    }
    aoDesarquivar();
  }

  return (
    <View style={estilos.coluna}>
      {erro && <Alerta tipo="alerta" titulo="Pet não desarquivado" mensagem={erro} />}
      <Botao titulo={`Desarquivar ${nome}`} variante="secundaria" larguraTotal carregando={enviando} onPress={() => void desarquivar()} />
    </View>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  coluna: { gap: espaco.sm, alignSelf: 'stretch' },
});
