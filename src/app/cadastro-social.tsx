import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Alerta, Botao, Campo, Cartao, Tela, Texto } from '../componentes';
import { cpfValido, somenteNumeros } from '../sessao/cadastro';
import { ErroApi, sessao } from '../sessao/sessao';
import { alvoToqueMinimo, cores, espaco, raio } from '../tema/tokens';

type Termo = components['schemas']['Termo'];

/** Conclui o cadastro iniciado pelo Google ou pela Apple (UC-01, RF46): CPF e aceite dos termos. */
export default function CadastroSocial() {
  const params = useLocalSearchParams<{ cadastroToken: string; nome?: string; email?: string }>();
  const [nome, setNome] = useState(params.nome ?? '');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [aceite, setAceite] = useState(false);
  const [termos, setTermos] = useState<Termo[]>([]);
  const [verTermos, setVerTermos] = useState(false);
  const [erros, setErros] = useState<{ nome?: string; cpf?: string; telefone?: string; aceite?: string }>({});
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void Promise.all([
      api.GET('/termos/vigentes', { params: { query: { tipo: 'TERMOS_USO_APP' } } }),
      api.GET('/termos/vigentes', { params: { query: { tipo: 'POLITICA_PRIVACIDADE' } } }),
    ]).then(([a, b]) => setTermos([...(a.data ?? []), ...(b.data ?? [])]));
  }, []);

  async function criar() {
    const tel = somenteNumeros(telefone);
    const encontrados = {
      ...(nome.trim().split(/\s+/).length < 2 ? { nome: 'Informe o nome e o sobrenome.' } : {}),
      ...(!cpfValido(cpf) ? { cpf: 'CPF inválido. Confira os números.' } : {}),
      ...(tel && (tel.length < 10 || tel.length > 11) ? { telefone: 'Informe o DDD e o número.' } : {}),
      ...(!aceite ? { aceite: 'Para criar a conta, aceite os termos de uso e a política de privacidade.' } : {}),
    };
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    setErroApi(null);
    try {
      await sessao.concluirCadastroSocial({
        cadastroToken: params.cadastroToken,
        nome: nome.trim(),
        cpf: somenteNumeros(cpf),
        ...(tel ? { telefone: tel } : {}),
        aceiteTermos: true,
      });
      router.replace('/');
    } catch (e) {
      const codigo = e instanceof ErroApi ? e.problema.codigo : undefined;
      setErroApi(
        codigo === 'LINK_EXPIRADO'
          ? 'O tempo para concluir o cadastro acabou. Volte e entre com o Google ou a Apple de novo.'
          : e instanceof ErroApi
            ? (e.problema.detail ?? e.problema.title ?? 'Confira os dados.')
            : 'Não foi possível criar a conta agora. Tente de novo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela titulo="Falta pouco" subtitulo={params.email ? `Conta com ${params.email}` : 'Complete seu cadastro.'}>
      {erroApi && <Alerta tipo="erro" titulo="Conta não criada" mensagem={erroApi} />}
      <Campo rotulo="Nome completo" value={nome} onChangeText={setNome} autoComplete="name" erro={erros.nome} />
      <Campo rotulo="CPF" value={cpf} onChangeText={setCpf} keyboardType="number-pad" erro={erros.cpf} />
      <Campo rotulo="Telefone (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" erro={erros.telefone} />

      <Botao titulo={verTermos ? 'Esconder os termos' : 'Ler os termos'} variante="texto" onPress={() => setVerTermos((v) => !v)} />
      {verTermos &&
        termos.map((t) => (
          <Cartao key={t.id} titulo={t.titulo} subtitulo={`Versão ${t.versao}`}>
            <Texto variante="legenda">{t.conteudo}</Texto>
          </Cartao>
        ))}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: aceite }}
        accessibilityLabel="Li e aceito os termos de uso e a política de privacidade"
        onPress={() => setAceite((a) => !a)}
        style={estilos.aceite}
      >
        <View style={[estilos.caixa, aceite && estilos.caixaMarcada]}>{aceite && <Texto cor={cores.branco}>✓</Texto>}</View>
        <Texto style={estilos.textoAceite}>Li e aceito os termos de uso e a política de privacidade</Texto>
      </Pressable>
      {erros.aceite && (
        <Texto variante="legenda" cor={cores.erro} accessibilityLiveRegion="polite">
          {erros.aceite}
        </Texto>
      )}
      <Botao titulo="Criar conta" larguraTotal carregando={enviando} onPress={() => void criar()} />
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  aceite: { flexDirection: 'row', alignItems: 'center', gap: espaco.sm, minHeight: alvoToqueMinimo },
  caixa: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: cores.textoSecundario,
    borderRadius: raio.padrao / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaMarcada: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  textoAceite: { flex: 1 },
});
