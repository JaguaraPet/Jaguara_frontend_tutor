/**
 * Cartão no app (UC-44, RN39): os dados vão direto para o gateway, que devolve um token; a
 * API do Jaguara recebe só o token e a bandeira, nunca o número do cartão.
 */

export interface DadosCartao {
  numero: string;
  validade: string; // MM/AA
  cvv: string;
  titular: string;
  cpf: string;
  debito: boolean;
}

/** Token que o gateway simulado da API recusa (mesmo valor do backend). */
export const TOKEN_RECUSADO = 'cartao-teste-recusado';

const soNumeros = (v: string) => v.replace(/\D/g, '');

/** Bandeira no formato do gateway (visa, master, elo, amex; débito com o prefixo "deb"). */
export function bandeira(numero: string, debito: boolean): string | null {
  const n = soNumeros(numero);
  let nome: string | null = null;
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) nome = 'elo';
  else if (/^4/.test(n)) nome = 'visa';
  // 5031 é o Mastercard de teste do sandbox do Mercado Pago.
  else if (/^(5[1-5]|2[2-7]|5031)/.test(n)) nome = 'master';
  else if (/^3[47]/.test(n)) nome = 'amex';
  if (!nome) return null;
  return debito && nome !== 'amex' ? `deb${nome}` : nome;
}

/** Luhn: confere o dígito verificador do número do cartão. */
export function numeroValido(numero: string): boolean {
  const n = soNumeros(numero);
  if (n.length < 13 || n.length > 19) return false;
  let soma = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    soma += d;
  }
  return soma % 10 === 0;
}

/** O que corrigir no formulário, ou null se dá para tokenizar. */
export function problemaNoCartao(c: DadosCartao, hoje = new Date()): string | null {
  if (!numeroValido(c.numero)) return 'Confira o número do cartão.';
  if (!bandeira(c.numero, c.debito)) return 'Esta bandeira não é aceita. Use Visa, Mastercard, Elo ou Amex.';
  const m = /^(\d{2})\/(\d{2})$/.exec(c.validade.trim());
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return 'Informe a validade como MM/AA.';
  const fimDoMes = new Date(2000 + Number(m[2]), Number(m[1]), 0, 23, 59);
  if (fimDoMes < hoje) return 'Este cartão está vencido.';
  if (!/^\d{3,4}$/.test(c.cvv)) return 'Informe o código de segurança (3 ou 4 dígitos).';
  if (c.titular.trim().length < 3) return 'Informe o nome como está no cartão.';
  if (soNumeros(c.cpf).length !== 11) return 'Informe o CPF do titular.';
  return null;
}

/**
 * Gera o token do cartão. Com EXPO_PUBLIC_MP_CHAVE_PUBLICA, chama a tokenização do Mercado
 * Pago; sem ela, gera um token de teste para o gateway simulado da API. Como nos cartões de
 * teste do Mercado Pago, o titular "OTHE" simula a recusa.
 */
export async function tokenizarCartao(c: DadosCartao): Promise<string> {
  const chave = process.env.EXPO_PUBLIC_MP_CHAVE_PUBLICA;
  if (!chave) {
    return c.titular.trim().toUpperCase() === 'OTHE' ? TOKEN_RECUSADO : `cartao-teste-${soNumeros(c.numero).slice(-4)}`;
  }
  const [mes, ano] = c.validade.split('/');
  const resposta = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(chave)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      card_number: soNumeros(c.numero),
      expiration_month: Number(mes),
      expiration_year: 2000 + Number(ano),
      security_code: c.cvv,
      cardholder: { name: c.titular.trim(), identification: { type: 'CPF', number: soNumeros(c.cpf) } },
    }),
  });
  const corpo = (await resposta.json()) as { id?: string };
  if (!resposta.ok || !corpo.id) throw new Error('Não foi possível validar o cartão no gateway.');
  return corpo.id;
}
