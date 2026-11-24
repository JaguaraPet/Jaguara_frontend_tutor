import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Campo, Cartao, Opcoes, Tela, Texto } from '../../../componentes';
import { mensagemDaApi } from '../../../pets/erros';
import { cores, espaco } from '../../../tema/tokens';

type Responsavel = components['schemas']['Responsavel'];
type Tipo = 'PRINCIPAL' | 'ADICIONAL';

const TIPOS: { valor: Tipo; rotulo: string }[] = [
  { valor: 'ADICIONAL', rotulo: 'Adicional' },
  { valor: 'PRINCIPAL', rotulo: 'Principal' },
];
const rotulo = (t?: string) => (t === 'PRINCIPAL' ? 'Responsável principal' : 'Responsável adicional');

/** Responsáveis pelo pet (UC-05, RN09): o principal convida, promove e remove; o adicional pode sair. */
export default function Responsaveis() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [lista, setLista] = useState<Responsavel[] | null>(null);
  const [email, setEmail] = useState('');
  const [tipo, setTipo] = useState<Tipo>('ADICIONAL');
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState<Responsavel | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.GET('/pets/{petId}/responsaveis', { params: { path: { petId } } }).then(({ data }) => {
      if (ativo) setLista(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  const eu = lista?.find((r) => r.voce);
  const souPrincipal = eu?.tipo === 'PRINCIPAL';

  async function convidar() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAviso({ tipo: 'erro', titulo: 'Informe o e-mail da conta do outro tutor.' });
      return;
    }
    setSalvando(true);
    const { error } = await api.POST('/pets/{petId}/responsaveis', {
      params: { path: { petId } },
      body: { email: email.trim(), tipo },
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Responsável não adicionado', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: 'Responsável adicionado', mensagem: 'A pessoa já vê o pet no app dela.' });
    setEmail('');
    setVersao((v) => v + 1);
  }

  async function trocarTipo(r: Responsavel) {
    const novo: Tipo = r.tipo === 'PRINCIPAL' ? 'ADICIONAL' : 'PRINCIPAL';
    const { error } = await api.PATCH('/pets/{petId}/responsaveis/{tutorId}', {
      params: { path: { petId, tutorId: r.tutorId! } },
      body: { tipo: novo },
    });
    setAviso(error ? { tipo: 'erro', titulo: 'Tipo não alterado', mensagem: mensagemDaApi(error) } : null);
    setVersao((v) => v + 1);
  }

  async function remover() {
    if (!removendo) return;
    const saiu = removendo.voce;
    const { error } = await api.DELETE('/pets/{petId}/responsaveis/{tutorId}', {
      params: { path: { petId, tutorId: removendo.tutorId! } },
    });
    setRemovendo(null);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Vínculo mantido', mensagem: mensagemDaApi(error) });
      return;
    }
    if (saiu) {
      router.replace('/pets');
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: 'Responsável removido' });
    setVersao((v) => v + 1);
  }

  if (lista === null) {
    return (
      <Tela titulo="Responsáveis">
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando os responsáveis" />
      </Tela>
    );
  }

  return (
    <Tela titulo="Responsáveis" subtitulo="Quem cuida do pet com você.">
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {removendo && (
        <>
          <Alerta
            tipo="alerta"
            titulo={removendo.voce ? 'Deixar de ser responsável?' : `Remover ${removendo.nome}?`}
            mensagem={removendo.voce ? 'O pet sai da sua lista.' : 'A pessoa deixa de ver o pet.'}
          />
          <View style={estilos.acoes}>
            <Botao titulo="Confirmar" variante="perigo" onPress={() => void remover()} />
            <Botao titulo="Cancelar" variante="texto" onPress={() => setRemovendo(null)} />
          </View>
        </>
      )}

      {lista.map((r) => (
        <Cartao key={r.tutorId} titulo={r.voce ? `${r.nome} (você)` : r.nome} subtitulo={rotulo(r.tipo)}>
          <View style={estilos.acoes}>
            {souPrincipal && !r.voce && (
              <Botao
                titulo={r.tipo === 'PRINCIPAL' ? 'Tornar adicional' : 'Tornar principal'}
                variante="secundaria"
                accessibilityLabel={`${r.tipo === 'PRINCIPAL' ? 'Tornar adicional' : 'Tornar principal'}: ${r.nome}`}
                onPress={() => void trocarTipo(r)}
              />
            )}
            {(r.voce || souPrincipal) && (
              <Botao
                titulo={r.voce ? 'Deixar de ser responsável' : 'Remover'}
                variante="texto"
                accessibilityLabel={r.voce ? 'Deixar de ser responsável' : `Remover ${r.nome}`}
                onPress={() => setRemovendo(r)}
              />
            )}
          </View>
        </Cartao>
      ))}

      {souPrincipal && (
        <Cartao titulo="Adicionar responsável" subtitulo="A pessoa precisa ter conta no Jaguara.">
          <Campo
            rotulo="E-mail do tutor"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Texto variante="legenda" negrito>
            Tipo
          </Texto>
          <Opcoes<Tipo> rotulo="Tipo" opcoes={TIPOS} valor={tipo} aoMudar={setTipo} />
          <Botao titulo="Adicionar" larguraTotal carregando={salvando} onPress={() => void convidar()} />
        </Cartao>
      )}
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
});
