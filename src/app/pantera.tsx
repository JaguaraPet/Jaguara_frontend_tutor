import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { preco } from '../catalogo/catalogo';
import { Alerta, Botao, Cartao, Tela, Texto } from '../componentes';
import { CobrancaPendente, FormularioPagamento, type Pagamento } from '../pagamento/FormularioPagamento';
import { mensagemDaApi } from '../pets/erros';
import { dataBr } from '../pets/formulario';
import { cores, espaco } from '../tema/tokens';

type Situacao = {
  plano?: 'GRATUITO' | 'PANTERA';
  vigente?: boolean;
  assinatura?: components['schemas']['Assinatura'];
  precoMensal?: number;
};

const BENEFICIOS = [
  'Assistente virtual para dúvidas do dia a dia do seu pet',
  'Respostas que consideram espécie, idade e alergias do pet',
  'Tudo do plano gratuito: saúde, rotina, agenda e despesas',
];

/** Plano PANTERA (ADR-010, UC-43 FA1): assinatura mensal paga com PIX, cartão ou boleto. */
export default function Pantera() {
  const [situacao, setSituacao] = useState<Situacao | null>(null);
  const [assinaturaId, setAssinaturaId] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const consultar = useCallback(async () => {
    const { data } = await api.GET('/assinaturas/atual');
    return (data ?? null) as Situacao | null;
  }, []);

  useEffect(() => {
    let ativo = true;
    consultar()
      .then((s) => ativo && setSituacao(s ?? { plano: 'GRATUITO', vigente: false }))
      .catch(() => ativo && setErro('Não deu para carregar o seu plano agora.'));
    return () => {
      ativo = false;
    };
  }, [consultar]);

  async function assinar() {
    setErro(null);
    setEnviando(true);
    try {
      const assinatura = await api.POST('/assinaturas');
      if (!assinatura.data?.id) throw new Error(mensagemDaApi(assinatura.error));
      setAssinaturaId(assinatura.data.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Tente de novo em instantes.');
    } finally {
      setEnviando(false);
    }
  }

  async function conferir() {
    const atual = await consultar();
    if (atual) setSituacao(atual);
    if (atual?.vigente) {
      setPagamento(null);
      setAssinaturaId(null);
    }
  }

  // Cartão aprovado na hora: a assinatura já vale.
  async function aoPagar(novo: Pagamento) {
    setPagamento(novo);
    if (novo.status === 'ACEITO') await conferir();
  }

  if (!situacao) {
    return (
      <Tela titulo="Plano PANTERA">
        {erro ? (
          <Alerta tipo="erro" titulo="Plano indisponível" mensagem={erro} />
        ) : (
          <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando o plano" />
        )}
      </Tela>
    );
  }

  return (
    <Tela titulo="Plano PANTERA" subtitulo="O assistente virtual do Jaguara para o seu pet.">
      {erro && <Alerta tipo="erro" titulo="Não foi possível assinar" mensagem={erro} />}
      {situacao.vigente ? (
        <Alerta
          tipo="sucesso"
          titulo="Você é PANTERA"
          mensagem={
            situacao.assinatura?.status === 'CANCELADA'
              ? `Cancelado. O acesso vale até ${dataBr(situacao.assinatura.dataFim)}.`
              : `Assinatura ativa até ${dataBr(situacao.assinatura?.dataFim)}.`
          }
        />
      ) : null}

      <Cartao titulo={`${preco(situacao.precoMensal ?? 0)} por mês`} subtitulo="Sem fidelidade">
        <View style={estilos.lista}>
          {BENEFICIOS.map((b) => (
            <Texto key={b}>• {b}</Texto>
          ))}
        </View>
      </Cartao>

      {pagamento?.status === 'PENDENTE' && (pagamento.qrCode || pagamento.boleto) ? (
        <>
          <CobrancaPendente pagamento={pagamento} />
          <Texto variante="legenda" cor={cores.textoSecundario}>
            A assinatura é ativada assim que o banco confirmar o pagamento.
          </Texto>
          <Botao titulo="Já paguei, conferir" variante="secundaria" onPress={() => void conferir()} />
        </>
      ) : situacao.vigente ? (
        <Botao titulo="Conversar com o assistente" larguraTotal onPress={() => router.push('/assistente')} />
      ) : assinaturaId ? (
        <>
          {pagamento && (pagamento.status === 'RECUSADO' || pagamento.status === 'CANCELADO') && (
            <Alerta
              tipo="erro"
              titulo="Pagamento não aprovado"
              mensagem={pagamento.motivoRecusa ?? 'O gateway não aprovou a transação. Nada foi cobrado.'}
            />
          )}
          <FormularioPagamento alvo={{ assinaturaId }} aoPagar={(novo) => void aoPagar(novo)} />
        </>
      ) : (
        <Botao titulo="Tornar-se membro" larguraTotal carregando={enviando} onPress={() => void assinar()} />
      )}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: espaco.xs, marginTop: espaco.sm },
});
