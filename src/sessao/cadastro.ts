/** Validações do cadastro do tutor no aparelho (UC-01), iguais às da API (ARQ-02, RN01). */

const soNumeros = (v: string) => v.replace(/\D/g, '');

export function problemaNaSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-zÀ-ÿ]/.test(senha) || !/\d/.test(senha)) return 'Use letras e números na senha.';
  return null;
}

/** CPF com os dois dígitos verificadores certos e sem todos os números iguais. */
export function cpfValido(cpf: string): boolean {
  const n = soNumeros(cpf);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  const digito = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(n[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(n[9]) && digito(10) === Number(n[10]);
}

export interface DadosCadastro {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  senha: string;
  repeticao: string;
  aceite: boolean;
}

/** Erros por campo; vazio quando dá para enviar. */
export function errosDoCadastro(d: DadosCadastro): Partial<Record<keyof DadosCadastro, string>> {
  const erros: Partial<Record<keyof DadosCadastro, string>> = {};
  if (d.nome.trim().split(/\s+/).length < 2) erros.nome = 'Informe o nome e o sobrenome.';
  if (!cpfValido(d.cpf)) erros.cpf = 'CPF inválido. Confira os números.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) erros.email = 'Informe um e-mail válido.';
  const tel = soNumeros(d.telefone);
  if (tel && (tel.length < 10 || tel.length > 11)) erros.telefone = 'Informe o DDD e o número.';
  const senha = problemaNaSenha(d.senha);
  if (senha) erros.senha = senha;
  else if (d.senha !== d.repeticao) erros.repeticao = 'As senhas não são iguais.';
  if (!d.aceite) erros.aceite = 'Para criar a conta, aceite os termos de uso e a política de privacidade.';
  return erros;
}

export const somenteNumeros = soNumeros;
