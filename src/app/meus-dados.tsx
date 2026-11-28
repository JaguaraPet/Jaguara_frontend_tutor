import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Alerta, Botao, Campo, Cartao, Tela } from '../componentes';
import { mensagemDaApi } from '../pets/erros';
import { cores } from '../tema/tokens';

type Conta = components['schemas']['MinhaConta'];

/** Meus dados: o tutor muda o próprio nome e telefone; o e-mail é o login e não muda aqui. */
export default function MeusDados() {
  const [conta, setConta] = useState<Conta | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    void api
      .GET('/conta')
      .then(({ data }) => {
        if (!ativo || !data) return;
        setConta(data);
        setNome(data.nome);
        setTelefone(data.telefone ?? '');
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  async function salvar() {
    setSalvando(true);
    const { data, error } = await api.PATCH('/conta', { body: { nome, telefone } });
    setSalvando(false);
    if (error || !data) {
      setAviso({ tipo: 'erro', titulo: 'Dados não salvos', mensagem: mensagemDaApi(error) });
      return;
    }
    setConta(data);
    setAviso({ tipo: 'sucesso', titulo: 'Dados salvos' });
  }

  return (
    <Tela titulo="Meus dados" subtitulo="Como você aparece para a família e as clínicas.">
      {!conta ? (
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando seus dados" />
      ) : (
        <Cartao>
          {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
          <Campo rotulo="Nome" value={nome} onChangeText={setNome} autoComplete="name" />
          <Campo rotulo="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" autoComplete="tel" />
          <Campo rotulo="E-mail de acesso" value={conta.email} desabilitado ajuda="É o seu login; não muda aqui." />
          <Botao titulo="Salvar meus dados" larguraTotal carregando={salvando} onPress={() => void salvar()} />
        </Cartao>
      )}
    </Tela>
  );
}
