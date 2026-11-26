import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Opcoes, Tela, Texto } from '../../../componentes';
import { ESCOPOS, VALIDADES, dataExpiracao, problemaNoCompartilhamento, rotuloEscopo } from '../../../pets/compartilhar';
import type { Escopo } from '../../../pets/compartilhar';
import { mensagemDaApi } from '../../../pets/erros';
import { alvoToqueMinimo, cores, espaco, raio } from '../../../tema/tokens';

type Compartilhamento = components['schemas']['Compartilhamento'];
type Empresa = components['schemas']['EmpresaPublica'];
type Modo = 'EMAIL' | 'EMPRESA';

const SITUACAO: Record<string, string> = { ATIVO: 'Ativo', REVOGADO: 'Revogado', EXPIRADO: 'Expirado' };

/** Compartilhar o perfil do pet por e-mail ou com uma empresa, por escopo (UC-11, RN15). */
export default function Compartilhar() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [lista, setLista] = useState<Compartilhamento[] | null>(null);
  const [modo, setModo] = useState<Modo>('EMPRESA');
  const [email, setEmail] = useState('');
  const [busca, setBusca] = useState('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [escopos, setEscopos] = useState<Escopo[]>(['PERFIL_BASICO']);
  const [validade, setValidade] = useState('30');
  const [link, setLink] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.GET('/pets/{petId}/compartilhamentos', { params: { path: { petId } } }).then(({ data }) => {
      if (ativo) setLista(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  async function buscarEmpresas() {
    const { data } = await api.GET('/empresas', { params: { query: { busca: busca.trim() } } });
    setEmpresas((data?.itens ?? []).slice(0, 6));
  }

  function alternar(e: Escopo) {
    setEscopos((atual) => (atual.includes(e) ? atual.filter((x) => x !== e) : [...atual, e]));
  }

  async function compartilhar() {
    const problema = problemaNoCompartilhamento({ modo, email, empresaId, escopos });
    if (problema) {
      setAviso({ tipo: 'erro', titulo: problema });
      return;
    }
    const { data, error } = await api.POST('/pets/{petId}/compartilhamentos', {
      params: { path: { petId } },
      body: {
        escopos,
        ...(modo === 'EMAIL' ? { destinatarioEmail: email.trim() } : { empresaId }),
        ...(dataExpiracao(validade) ? { dataExpiracao: dataExpiracao(validade) } : {}),
      },
    });
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Compartilhamento não criado', mensagem: mensagemDaApi(error) });
      return;
    }
    setLink(data?.link ?? null);
    setAviso({
      tipo: 'sucesso',
      titulo: 'Perfil compartilhado',
      mensagem: modo === 'EMAIL' ? 'Enviamos o link por e-mail. Ele só aparece agora; guarde se quiser mandar de novo.' : 'A empresa já vê o que você liberou.',
    });
    setVersao((v) => v + 1);
  }

  async function revogar(c: Compartilhamento) {
    const { error } = await api.POST('/compartilhamentos/{compartilhamentoId}/revogacao', {
      params: { path: { compartilhamentoId: c.id! } },
    });
    setAviso(error ? { tipo: 'erro', titulo: 'Não foi possível revogar' } : { tipo: 'sucesso', titulo: 'Acesso revogado' });
    setVersao((v) => v + 1);
  }

  return (
    <Tela titulo="Compartilhar perfil" subtitulo="Escolha com quem e o que mostrar.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {link && <Botao titulo="Enviar o link" variante="secundaria" onPress={() => void Share.share({ message: link })} />}

      <Cartao titulo="Novo compartilhamento">
        <Opcoes<Modo>
          rotulo="Com quem"
          opcoes={[
            { valor: 'EMPRESA', rotulo: 'Empresa no Jaguara' },
            { valor: 'EMAIL', rotulo: 'Pessoa por e-mail' },
          ]}
          valor={modo}
          aoMudar={setModo}
        />
        {modo === 'EMAIL' ? (
          <Campo rotulo="E-mail de quem recebe" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        ) : (
          <>
            <Campo rotulo="Buscar empresa" value={busca} onChangeText={setBusca} onSubmitEditing={() => void buscarEmpresas()} />
            <Botao titulo="Buscar" variante="texto" onPress={() => void buscarEmpresas()} />
            {empresas.length > 0 && (
              <Opcoes rotulo="Empresa" opcoes={empresas.map((e) => ({ valor: e.id!, rotulo: e.nomeFantasia ?? '' }))} valor={empresaId} aoMudar={setEmpresaId} />
            )}
          </>
        )}
        <Texto variante="legenda" negrito>
          O que compartilhar
        </Texto>
        <View style={estilos.grupo} accessibilityLabel="O que compartilhar">
          {ESCOPOS.filter((e) => modo === 'EMPRESA' || e.valor !== 'EDICAO_CLINICA').map((e) => {
            const marcado = escopos.includes(e.valor);
            return (
              <Pressable
                key={e.valor}
                accessibilityRole="checkbox"
                accessibilityLabel={e.rotulo}
                accessibilityState={{ checked: marcado }}
                onPress={() => alternar(e.valor)}
                style={[estilos.opcao, marcado && estilos.marcada]}
              >
                <Texto cor={marcado ? cores.branco : cores.texto}>{e.rotulo}</Texto>
              </Pressable>
            );
          })}
        </View>
        <Texto variante="legenda" negrito>
          Por quanto tempo
        </Texto>
        <Opcoes rotulo="Validade" opcoes={VALIDADES} valor={validade} aoMudar={setValidade} />
        <Botao titulo="Compartilhar" larguraTotal onPress={() => void compartilhar()} />
      </Cartao>

      <Texto variante="titulo2">Compartilhamentos</Texto>
      {lista === null ? (
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando os compartilhamentos" />
      ) : lista.length === 0 ? (
        <Texto cor={cores.textoSecundario}>O perfil ainda não foi compartilhado.</Texto>
      ) : (
        lista.map((c) => (
          <Cartao
            key={c.id}
            titulo={c.destinatarioEmail ?? 'Empresa'}
            subtitulo={`${SITUACAO[c.status ?? ''] ?? c.status}${c.dataExpiracao ? ` · até ${new Date(c.dataExpiracao).toLocaleDateString('pt-BR')}` : ''}`}
          >
            <Texto variante="legenda">{c.escopos.map(rotuloEscopo).join(', ')}</Texto>
            {c.status === 'ATIVO' && (
              <Botao titulo="Revogar" variante="texto" accessibilityLabel={`Revogar acesso de ${c.destinatarioEmail ?? 'empresa'}`} onPress={() => void revogar(c)} />
            )}
          </Cartao>
        ))
      )}
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  grupo: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: {
    minHeight: alvoToqueMinimo,
    justifyContent: 'center',
    paddingHorizontal: espaco.md,
    borderWidth: 1,
    borderColor: cores.textoSecundario,
    borderRadius: raio.padrao,
  },
  marcada: { backgroundColor: cores.secundaria, borderColor: cores.secundaria },
});
