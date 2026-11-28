import type { components } from '../api/esquema';

export type EmpresaPublica = components['schemas']['EmpresaPublica'];
export type Servico = components['schemas']['Servico'];
export type Categoria = Servico['categoria'];

/** Categorias de serviço na ordem dos filtros da busca (UC-33). */
export const CATEGORIAS: { valor: Categoria; rotulo: string }[] = [
  { valor: 'CONSULTA', rotulo: 'Consulta' },
  { valor: 'VACINACAO', rotulo: 'Vacinação' },
  { valor: 'EXAME', rotulo: 'Exame' },
  { valor: 'CIRURGIA', rotulo: 'Cirurgia' },
  { valor: 'BANHO_TOSA', rotulo: 'Banho e tosa' },
  { valor: 'HOSPEDAGEM', rotulo: 'Hospedagem' },
  { valor: 'CRECHE', rotulo: 'Creche' },
  { valor: 'PET_SITTER', rotulo: 'Pet sitter' },
  { valor: 'OUTRO', rotulo: 'Outros' },
];

const TIPOS: Record<NonNullable<EmpresaPublica['tipo']>, string> = {
  CLINICA_VETERINARIA: 'Clínica veterinária',
  PET_SHOP: 'Pet shop',
  HOTEL_PET: 'Hotel pet',
  CRECHE: 'Creche',
  CASA_DE_CUIDADO: 'Casa de cuidado',
};

export function rotuloTipo(tipo?: EmpresaPublica['tipo']): string {
  return tipo ? TIPOS[tipo] : 'Empresa';
}

export function rotuloCategoria(categoria: string): string {
  return CATEGORIAS.find((c) => c.valor === categoria)?.rotulo ?? categoria;
}

/** "Centro, Curitiba - PR", sem partes vazias. */
export function local(empresa: EmpresaPublica): string {
  const cidade = [empresa.cidade, empresa.uf].filter(Boolean).join(' - ');
  return [empresa.bairro, cidade].filter(Boolean).join(', ');
}

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function preco(valor: number): string {
  return moeda.format(valor).replace(/ /g, ' ');
}

/** 30 min, 1 h, 1 h 30 min. */
export function duracao(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

/** "1,2 km" ou "350 m". */
export function textoDistancia(km?: number): string | undefined {
  if (km === undefined) return undefined;
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
}

/** "★ 4,8 (23) · 1,2 km · a partir de R$ 60", só com o que a empresa tem. */
export function destaques(empresa: EmpresaPublica): string {
  const partes: string[] = [];
  if (empresa.notaMedia !== undefined && (empresa.totalAvaliacoes ?? 0) > 0) {
    partes.push(`★ ${empresa.notaMedia.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} (${empresa.totalAvaliacoes})`);
  }
  const distancia = textoDistancia(empresa.distanciaKm);
  if (distancia) partes.push(distancia);
  if (empresa.precoAPartirDe !== undefined) {
    partes.push(
      `a partir de ${empresa.precoAPartirDe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`,
    );
  }
  return partes.join(' · ');
}
