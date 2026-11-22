/** Textos do perfil do pet (UC-04, UC-37). */

export const SEXO: Record<string, string> = { MACHO: 'Macho', FEMEA: 'Fêmea' };

export const TIPO_ALERGIA: Record<string, string> = {
  ALERGIA: 'Alergia',
  RESTRICAO_ALIMENTAR: 'Restrição alimentar',
  RESTRICAO_MEDICAMENTOSA: 'Restrição a medicamento',
  OUTRA: 'Outra',
};

export const GRAVIDADE: Record<string, string> = {
  LEVE: 'leve',
  MODERADA: 'moderada',
  GRAVE: 'grave',
};

/** "3 anos", "1 ano" ou "menos de 1 ano"; sem data de nascimento, nada. */
export function textoIdade(idade?: number): string | undefined {
  if (idade === undefined || idade === null) return undefined;
  if (idade < 1) return 'menos de 1 ano';
  return idade === 1 ? '1 ano' : `${idade} anos`;
}

/** Data AAAA-MM-DD como DD/MM/AAAA. */
export const dataCurta = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

/** Próxima dose mais perto a partir de hoje, entre as vacinas registradas. */
export function proximaDose(
  vacinas: { nomeVacina: string; dataProximaDose?: string }[],
  hoje: string,
): { nomeVacina: string; data: string } | undefined {
  return vacinas
    .filter((v) => v.dataProximaDose && v.dataProximaDose >= hoje)
    .map((v) => ({ nomeVacina: v.nomeVacina, data: v.dataProximaDose! }))
    .sort((a, b) => a.data.localeCompare(b.data))[0];
}
