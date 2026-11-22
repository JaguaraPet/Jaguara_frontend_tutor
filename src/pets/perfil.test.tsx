import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import PerfilPet from '../app/pets/[petId]/index';
import { proximaDose, textoIdade } from './perfil';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ petId: 'p1' }),
}));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const thor = {
  id: 'p1',
  nome: 'Thor',
  especie: 'Cachorro',
  raca: 'SRD',
  racaId: 'r1',
  sexo: 'MACHO',
  idade: 3,
  dataNascimento: '2023-05-10',
  pesoKg: 12.5,
  castrado: true,
  status: 'ATIVO',
};

function api_(rotas: Record<string, unknown>) {
  jest.spyOn(api, 'GET').mockImplementation(((caminho: string) => {
    const corpo = rotas[caminho];
    return corpo === undefined ? resposta({ title: 'Acesso negado' }, 403) : resposta(corpo);
  }) as never);
}

describe('UC-04 · Perfil do pet no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve formatar a idade e achar a próxima dose', () => {
    expect(textoIdade(0)).toBe('menos de 1 ano');
    expect(textoIdade(1)).toBe('1 ano');
    expect(textoIdade(undefined)).toBeUndefined();
    expect(
      proximaDose(
        [
          { nomeVacina: 'V10', dataProximaDose: '2027-01-10' },
          { nomeVacina: 'Raiva', dataProximaDose: '2026-12-01' },
          { nomeVacina: 'Gripe', dataProximaDose: '2026-01-01' },
        ],
        '2026-11-22',
      ),
    ).toEqual({ nomeVacina: 'Raiva', data: '2026-12-01' });
  });

  it('CT-37-01: deve mostrar os dados e a alergia grave em destaque', async () => {
    api_({
      '/pets/{petId}': thor,
      '/pets/{petId}/alergias': [
        { id: 'a1', tipo: 'RESTRICAO_MEDICAMENTOSA', descricao: 'Dipirona', gravidade: 'GRAVE', destaque: true },
        { id: 'a2', tipo: 'ALERGIA', descricao: 'Pulga', gravidade: 'LEVE', destaque: false },
      ],
      '/pets/{petId}/vacinacoes': [
        { id: 'v1', nomeVacina: 'V10', dataAplicacao: '2026-10-01', dataProximaDose: '2099-10-01', responsavelAplicacao: 'Dra. Júlia' },
      ],
    });
    await render(<PerfilPet />);
    expect(await screen.findByText('Atenção: restrição a medicamento grave')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByText('12,5 kg')).toBeOnTheScreen();
    expect(screen.getByText('3 anos')).toBeOnTheScreen();
    expect(screen.getByText('Alergia: Pulga (leve)')).toBeOnTheScreen();
    expect(screen.getByText('Próxima dose: V10 em 01/10/2099')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Editar dados' }));
    expect(router.push).toHaveBeenCalledWith('/pets/p1/editar');
  });

  it('deve avisar quando o pet não está acessível', async () => {
    api_({});
    await render(<PerfilPet />);
    expect(await screen.findByText('Pet indisponível')).toBeOnTheScreen();
  });
});
