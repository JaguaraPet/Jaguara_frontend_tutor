import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Alerta, Botao, Campo, Icone, Tela, Texto } from '../componentes';
import { mensagemDaApi } from '../pets/erros';
import { errosDoCadastro, somenteNumeros } from '../sessao/cadastro';
import type { DadosCadastro } from '../sessao/cadastro';
import { alvoToqueMinimo, cores, espaco, raio } from '../tema/tokens';
import { criarEstilos } from '../tema/estilos';

type Termo = components['schemas']['Termo'];

/** Termo com o texto aberto ao tocar no título. */
function TermoExpansivel({ termo }: { termo: Termo }) {
  const [aberto, setAberto] = useState(false);
  return (
    <View style={estilos.termo}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: aberto }}
        onPress={() => setAberto(!aberto)}
        style={estilos.linhaToque}
      >
        <Texto negrito cor={cores.destaque}>
          {aberto ? '▾' : '▸'} {termo.titulo} (versão {termo.versao})
        </Texto>
      </Pressable>
      {aberto && <Texto variante="legenda">{termo.conteudo}</Texto>}
    </View>
  );
}

/** Criar conta do tutor (UC-01, RN01, RN02, RN42). */
export default function Cadastro() {
  const [dados, setDados] = useState<DadosCadastro>({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    senha: '',
    repeticao: '',
    aceite: false,
  });
  const [erros, setErros] = useState<Partial<Record<keyof DadosCadastro, string>>>({});
  const [termos, setTermos] = useState<Termo[]>([]);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [criada, setCriada] = useState(false);

  useEffect(() => {
    void Promise.all([
      api.GET('/termos/vigentes', { params: { query: { tipo: 'TERMOS_USO_APP' } } }),
      api.GET('/termos/vigentes', { params: { query: { tipo: 'POLITICA_PRIVACIDADE' } } }),
    ]).then((respostas) => setTermos(respostas.flatMap((r) => r.data ?? [])));
  }, []);

  const mudar = (campo: keyof DadosCadastro) => (valor: string | boolean) =>
    setDados((d) => ({ ...d, [campo]: valor }));

  async function criar() {
    const encontrados = errosDoCadastro(dados);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setErroApi(null);
    setEnviando(true);
    const { error } = await api.POST('/auth/cadastro/tutor', {
      body: {
        nome: dados.nome.trim(),
        cpf: somenteNumeros(dados.cpf),
        email: dados.email.trim(),
        telefone: somenteNumeros(dados.telefone) || undefined,
        senha: dados.senha,
        aceiteTermos: true,
      },
    });
    setEnviando(false);
    if (error) {
      setErroApi(mensagemDaApi(error));
      return;
    }
    setCriada(true);
  }

  if (criada) {
    return (
      <Tela titulo="Confirme seu e-mail">
        <Alerta
          tipo="sucesso"
          titulo="Conta criada"
          mensagem={`Enviamos um link para ${dados.email.trim()}. Toque nele para ativar a conta (vale 24 horas) e depois entre no app.`}
        />
        <Botao titulo="Ir para o login" larguraTotal onPress={() => router.replace('/entrar')} />
      </Tela>
    );
  }

  return (
    <Tela titulo="Criar conta" subtitulo="Cadastre-se para cuidar da saúde e da rotina dos seus pets.">
      {erroApi && <Alerta tipo="erro" titulo="Conta não criada" mensagem={erroApi} />}
      <Campo rotulo="Nome completo" autoComplete="name" value={dados.nome} onChangeText={mudar('nome')} erro={erros.nome} />
      <Campo rotulo="CPF" keyboardType="number-pad" value={dados.cpf} onChangeText={mudar('cpf')} erro={erros.cpf} />
      <Campo
        rotulo="E-mail"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={dados.email}
        onChangeText={mudar('email')}
        erro={erros.email}
      />
      <Campo
        rotulo="Celular (opcional)"
        keyboardType="phone-pad"
        value={dados.telefone}
        onChangeText={mudar('telefone')}
        erro={erros.telefone}
      />
      <Campo
        rotulo="Senha"
        secureTextEntry
        autoComplete="new-password"
        ajuda="Pelo menos 8 caracteres, com letras e números."
        value={dados.senha}
        onChangeText={mudar('senha')}
        erro={erros.senha}
      />
      <Campo
        rotulo="Repita a senha"
        secureTextEntry
        autoComplete="new-password"
        value={dados.repeticao}
        onChangeText={mudar('repeticao')}
        erro={erros.repeticao}
      />

      {termos.map((t) => (
        <TermoExpansivel key={t.id} termo={t} />
      ))}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: dados.aceite }}
        accessibilityLabel="Li e aceito os termos de uso e a política de privacidade"
        onPress={() => mudar('aceite')(!dados.aceite)}
        style={estilos.aceite}
      >
        <View style={[estilos.caixa, dados.aceite && estilos.caixaMarcada]}>
          {dados.aceite && <Icone nome="check" tamanho={16} cor={cores.sobrePrimaria} />}
        </View>
        <Texto style={estilos.textoAceite}>Li e aceito os termos de uso e a política de privacidade</Texto>
      </Pressable>
      {erros.aceite && (
        <Texto variante="legenda" cor={cores.erro} accessibilityLiveRegion="polite">
          {erros.aceite}
        </Texto>
      )}

      <Botao titulo="Criar conta" larguraTotal carregando={enviando} onPress={() => void criar()} />
      <Botao titulo="Já tenho conta" variante="texto" onPress={() => router.replace('/entrar')} />
    </Tela>
  );
}

const estilos = criarEstilos(() => ({
  termo: { gap: espaco.xs, alignSelf: 'stretch' },
  linhaToque: { minHeight: alvoToqueMinimo, justifyContent: 'center' },
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
}));
