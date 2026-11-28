import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { api } from '../../api/cliente';
import { Alerta, Botao, Tela } from '../../componentes';
import { CobrancaPendente, FormularioPagamento, type Meio, type Pagamento } from '../../pagamento/FormularioPagamento';

const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

/** Realizar pagamento de um agendamento com PIX, cartão ou boleto (UC-44, RN27, RN39). */
export default function Pagar() {
  const { agendamentoId, servico, valor } = useLocalSearchParams<{ agendamentoId: string; servico?: string; valor?: string }>();
  const [meio, setMeio] = useState<Meio>('PIX');
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);

  // PIX pendente: confere a cada 5 segundos se o banco confirmou (o webhook atualiza a API).
  useEffect(() => {
    if (pagamento?.status !== 'PENDENTE' || pagamento.metodo !== 'PIX') return;
    const id = setInterval(() => {
      void api.GET('/pagamentos').then(({ data }) => {
        const atual = data?.find((p) => p.id === pagamento.id);
        if (atual && atual.status !== 'PENDENTE') setPagamento({ ...pagamento, ...atual });
      });
    }, 5000);
    return () => clearInterval(id);
  }, [pagamento]);

  const titulo = servico ? `Pagar ${servico}` : 'Pagamento';
  const subtitulo = valor ? `Valor contratado: ${reais(Number(valor))}` : undefined;

  if (pagamento?.status === 'ACEITO') {
    return (
      <Tela titulo={titulo} subtitulo={subtitulo}>
        <Alerta
          tipo="sucesso"
          titulo="Pagamento confirmado"
          mensagem={`Recebemos ${reais(pagamento.valor ?? 0)}. A empresa também foi avisada.`}
        />
        <Botao titulo="Voltar" larguraTotal onPress={() => router.back()} />
      </Tela>
    );
  }

  if (pagamento?.status === 'RECUSADO' || pagamento?.status === 'CANCELADO') {
    return (
      <Tela titulo={titulo} subtitulo={subtitulo}>
        <Alerta
          tipo="erro"
          titulo="Pagamento não aprovado"
          mensagem={pagamento.motivoRecusa ?? 'O gateway não aprovou a transação. Nada foi cobrado.'}
        />
        <Botao titulo="Tentar outro meio" larguraTotal onPress={() => setPagamento(null)} />
      </Tela>
    );
  }

  if (pagamento?.status === 'PENDENTE' && (pagamento.qrCode || pagamento.boleto)) {
    return (
      <Tela titulo={titulo} subtitulo={subtitulo}>
        <CobrancaPendente pagamento={pagamento} />
        {pagamento.qrCode && (
          <Alerta tipo="info" titulo="Aguardando o banco" mensagem="Esta tela atualiza sozinha quando o PIX for confirmado." />
        )}
      </Tela>
    );
  }

  return (
    <Tela titulo={titulo} subtitulo={subtitulo}>
      <FormularioPagamento
        alvo={{ agendamentoId }}
        meioInicial={meio}
        aoPagar={(novo, usado) => {
          setMeio(usado);
          setPagamento(novo);
        }}
      />
    </Tela>
  );
}
