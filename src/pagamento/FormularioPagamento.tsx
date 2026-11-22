import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Alerta, Botao, Campo, Cartao, Texto } from '../componentes';
import { mensagemDaApi } from '../pets/erros';
import { alvoToqueMinimo, cores, espaco, raio } from '../tema/tokens';
import { bandeira, problemaNoCartao, tokenizarCartao } from './cartao';

export type Pagamento = components['schemas']['Pagamento'];
export type Meio = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'BOLETO';
type Endereco = components['schemas']['Endereco'];
type Alvo = { agendamentoId: string } | { assinaturaId: string };

const MEIOS: { valor: Meio; rotulo: string }[] = [
  { valor: 'PIX', rotulo: 'PIX' },
  { valor: 'CARTAO_CREDITO', rotulo: 'Cartão de crédito' },
  { valor: 'CARTAO_DEBITO', rotulo: 'Cartão de débito' },
  { valor: 'BOLETO', rotulo: 'Boleto' },
];

const ACAO: Record<Meio, string> = {
  PIX: 'Gerar código PIX',
  CARTAO_CREDITO: 'Pagar com cartão',
  CARTAO_DEBITO: 'Pagar com cartão',
  BOLETO: 'Gerar boleto',
};

const ENDERECO_VAZIO = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };
const soNumeros = (v: string) => v.replace(/\D/g, '');

/**
 * Endereço do boleto: em branco, a API usa o último informado; preenchido, precisa estar completo.
 * Devolve o endereço para o pedido ou a mensagem do que falta.
 */
export function enderecoDoBoleto(campos: typeof ENDERECO_VAZIO): { endereco?: Endereco; problema?: string } {
  const preenchidos = Object.values(campos).some((v) => v.trim());
  if (!preenchidos) return {};
  const cep = soNumeros(campos.cep);
  const uf = campos.uf.trim().toUpperCase();
  if (cep.length !== 8) return { problema: 'Informe o CEP com 8 números.' };
  if (!campos.logradouro.trim() || !campos.numero.trim() || !campos.bairro.trim() || !campos.cidade.trim()) {
    return { problema: 'Preencha rua, número, bairro e cidade.' };
  }
  if (!/^[A-Z]{2}$/.test(uf)) return { problema: 'Informe a UF com 2 letras.' };
  return {
    endereco: {
      cep,
      logradouro: campos.logradouro.trim(),
      numero: campos.numero.trim(),
      ...(campos.complemento.trim() ? { complemento: campos.complemento.trim() } : {}),
      bairro: campos.bairro.trim(),
      cidade: campos.cidade.trim(),
      uf,
    },
  };
}

/** Escolha do meio e dados do cartão ou do endereço do boleto (UC-44, RN39). */
export function FormularioPagamento({
  alvo,
  meioInicial = 'PIX',
  aoPagar,
}: {
  alvo: Alvo;
  meioInicial?: Meio;
  aoPagar: (pagamento: Pagamento, meio: Meio) => void;
}) {
  const [meio, setMeio] = useState<Meio>(meioInicial);
  const [numero, setNumero] = useState('');
  const [validade, setValidade] = useState('');
  const [cvv, setCvv] = useState('');
  const [titular, setTitular] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState(ENDERECO_VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mudarEndereco = (campo: keyof typeof ENDERECO_VAZIO) => (valor: string) =>
    setEndereco((atual) => ({ ...atual, [campo]: valor }));

  async function pagar() {
    setErro(null);
    const ehCartao = meio === 'CARTAO_CREDITO' || meio === 'CARTAO_DEBITO';
    const cartao = ehCartao ? { numero, validade, cvv, titular, cpf, debito: meio === 'CARTAO_DEBITO' } : null;
    if (cartao) {
      const problema = problemaNoCartao(cartao);
      if (problema) {
        setErro(problema);
        return;
      }
    }
    const boleto = meio === 'BOLETO' ? enderecoDoBoleto(endereco) : {};
    if (boleto.problema) {
      setErro(boleto.problema);
      return;
    }
    setEnviando(true);
    try {
      const extra = cartao
        ? { tokenCartao: await tokenizarCartao(cartao), bandeiraCartao: bandeira(cartao.numero, cartao.debito)! }
        : boleto.endereco
          ? { endereco: boleto.endereco }
          : {};
      const { data, error } = await api.POST('/pagamentos', { body: { ...alvo, metodo: meio, ...extra } });
      if (error) {
        setErro(mensagemDaApi(error));
        return;
      }
      setCvv('');
      aoPagar(data, meio);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível pagar agora.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {erro && <Alerta tipo="erro" titulo="Pagamento não concluído" mensagem={erro} />}
      <Texto variante="titulo2">Meio de pagamento</Texto>
      <View style={estilos.meios} accessibilityRole="radiogroup" accessibilityLabel="Meio de pagamento">
        {MEIOS.map((m) => (
          <Pressable
            key={m.valor}
            accessibilityRole="radio"
            accessibilityLabel={m.rotulo}
            accessibilityState={{ checked: meio === m.valor }}
            onPress={() => setMeio(m.valor)}
            style={[estilos.meio, meio === m.valor && estilos.escolhido]}
          >
            <Texto negrito={meio === m.valor} cor={meio === m.valor ? cores.branco : cores.texto}>
              {m.rotulo}
            </Texto>
          </Pressable>
        ))}
      </View>

      {(meio === 'CARTAO_CREDITO' || meio === 'CARTAO_DEBITO') && (
        <Cartao subtitulo="Os dados do cartão vão direto para o gateway de pagamento; o Jaguara não guarda o número.">
          <Campo rotulo="Número do cartão" keyboardType="number-pad" value={numero} onChangeText={setNumero} />
          <Campo rotulo="Validade (MM/AA)" keyboardType="number-pad" value={validade} onChangeText={setValidade} maxLength={5} />
          <Campo rotulo="Código de segurança" keyboardType="number-pad" secureTextEntry value={cvv} onChangeText={setCvv} maxLength={4} />
          <Campo rotulo="Nome no cartão" autoCapitalize="characters" value={titular} onChangeText={setTitular} />
          <Campo rotulo="CPF do titular" keyboardType="number-pad" value={cpf} onChangeText={setCpf} />
        </Cartao>
      )}

      {meio === 'BOLETO' && (
        <Cartao
          titulo="Endereço para o boleto"
          subtitulo="O banco exige o endereço de quem paga. Se você já informou em outro boleto, pode deixar em branco."
        >
          <Campo rotulo="CEP" keyboardType="number-pad" value={endereco.cep} onChangeText={mudarEndereco('cep')} maxLength={9} />
          <Campo rotulo="Rua" value={endereco.logradouro} onChangeText={mudarEndereco('logradouro')} />
          <Campo rotulo="Número" value={endereco.numero} onChangeText={mudarEndereco('numero')} maxLength={10} />
          <Campo rotulo="Complemento" value={endereco.complemento} onChangeText={mudarEndereco('complemento')} />
          <Campo rotulo="Bairro" value={endereco.bairro} onChangeText={mudarEndereco('bairro')} />
          <Campo rotulo="Cidade" value={endereco.cidade} onChangeText={mudarEndereco('cidade')} />
          <Campo rotulo="UF" autoCapitalize="characters" value={endereco.uf} onChangeText={mudarEndereco('uf')} maxLength={2} />
        </Cartao>
      )}

      <Botao titulo={ACAO[meio]} larguraTotal carregando={enviando} onPress={() => void pagar()} />
    </>
  );
}

const dataBr = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

/** Cobrança aguardando o banco: código PIX copia e cola ou boleto com linha digitável. */
export function CobrancaPendente({ pagamento }: { pagamento: Pagamento }) {
  if (pagamento.boleto) {
    const { url, linhaDigitavel, vencimento } = pagamento.boleto;
    return (
      <Cartao titulo="Pague o boleto" subtitulo={`Vence em ${dataBr(vencimento)}. Pague no app do banco ou numa lotérica.`}>
        <Texto selectable style={estilos.codigo} accessibilityLabel="Linha digitável do boleto">
          {linhaDigitavel}
        </Texto>
        <Botao titulo="Abrir boleto" variante="secundaria" onPress={() => void Linking.openURL(url)} />
        <Texto variante="legenda" cor={cores.textoSecundario}>
          O banco confirma o boleto em até 3 dias úteis. Você pode sair desta tela; o pagamento aparece em Pagamentos.
        </Texto>
      </Cartao>
    );
  }
  return (
    <Cartao titulo="Pague com PIX" subtitulo="Copie o código no app do seu banco.">
      <Texto selectable style={estilos.codigo} accessibilityLabel="Código PIX copia e cola">
        {pagamento.qrCode}
      </Texto>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  meios: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  meio: {
    minHeight: alvoToqueMinimo,
    justifyContent: 'center',
    paddingHorizontal: espaco.md,
    borderWidth: 1,
    borderColor: cores.textoSecundario,
    borderRadius: raio.padrao,
  },
  escolhido: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  codigo: { padding: espaco.md, borderRadius: raio.padrao, backgroundColor: cores.fundo, fontFamily: 'monospace' },
});
