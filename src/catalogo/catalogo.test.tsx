import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import Servicos from '../app/(abas)/servicos';
import PerfilEmpresa from '../app/empresa/[empresaId]';
import { destaques, duracao, local, preco, rotuloCategoria, rotuloTipo, textoDistancia } from './catalogo';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: -23.56, longitude: -46.65 } })),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ empresaId: 'e1' }),
}));

const clinica = {
  id: 'e1',
  nomeFantasia: 'Clínica Patas',
  tipo: 'CLINICA_VETERINARIA' as const,
  bairro: 'Centro',
  cidade: 'Curitiba',
  uf: 'PR',
  categorias: ['CONSULTA', 'VACINACAO'],
};

type Resposta = Awaited<ReturnType<typeof api.GET>>;
const ok = (data: unknown) =>
  Promise.resolve({ data, response: new Response(null, { status: 200 }) } as unknown as Resposta);

describe('UC-33 · Busca de empresas e catálogo no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve formatar tipo, categoria, local, preço e duração', () => {
    expect(rotuloTipo('PET_SHOP')).toBe('Pet shop');
    expect(rotuloTipo()).toBe('Empresa');
    expect(rotuloCategoria('BANHO_TOSA')).toBe('Banho e tosa');
    expect(rotuloCategoria('NOVA')).toBe('NOVA');
    expect(local(clinica)).toBe('Centro, Curitiba - PR');
    expect(local({ id: 'x', cidade: 'Curitiba' })).toBe('Curitiba');
    expect(preco(60)).toBe('R$ 60,00');
    expect(duracao(30)).toBe('30 min');
    expect(duracao(60)).toBe('1 h');
    expect(duracao(90)).toBe('1 h 30 min');
  });

  it('deve listar as empresas, filtrar por categoria e abrir o perfil', async () => {
    const get = jest
      .spyOn(api, 'GET')
      .mockImplementation(() => ok({ itens: [clinica], total: 1, pagina: 1, tamanho: 30 }));
    await render(<Servicos />);
    expect(await screen.findByText('Clínica Patas')).toBeOnTheScreen();
    expect(screen.getByText('1 empresa encontrada')).toBeOnTheScreen();
    expect(screen.getByText('Consulta, Vacinação')).toBeOnTheScreen();

    get.mockImplementation(() => ok({ itens: [], total: 0 }));
    await fireEvent.press(screen.getByLabelText('Banho e tosa'));
    expect(await screen.findByText(/Nenhuma empresa encontrada/)).toBeOnTheScreen();
    expect(get).toHaveBeenLastCalledWith('/empresas', {
      params: { query: { busca: undefined, categoria: 'BANHO_TOSA', pagina: 1, tamanho: 30 } },
    });
    expect(screen.getByLabelText('Banho e tosa, filtro ativo')).toBeOnTheScreen();

    get.mockImplementation(() => ok({ itens: [clinica], total: 1 }));
    await fireEvent.changeText(screen.getByLabelText('Buscar empresa ou serviço'), ' vacina ');
    await fireEvent.press(screen.getByText('Buscar'));
    await fireEvent.press(await screen.findByLabelText('Clínica Patas, Clínica veterinária. Ver serviços'));
    expect(router.push).toHaveBeenCalledWith('/empresa/e1');
  });

  it('deve mostrar nota, distância e preço "a partir de"', () => {
    expect(textoDistancia(0.32)).toBe('300 m');
    expect(textoDistancia(2.46)).toBe('2,5 km');
    expect(
      destaques({ ...clinica, notaMedia: 4.8, totalAvaliacoes: 23, distanciaKm: 1.2, precoAPartirDe: 60 }).replace(/ /g, ' '),
    ).toBe(
      '★ 4,8 (23) · 1,2 km · a partir de R$ 60',
    );
    expect(destaques({ ...clinica, totalAvaliacoes: 0 })).toBe('');
  });

  it('deve buscar perto da localização do aparelho', async () => {
    const get = jest
      .spyOn(api, 'GET')
      .mockImplementation(() => ok({ itens: [{ ...clinica, distanciaKm: 0.8, totalAvaliacoes: 0 }], total: 1 }));
    await render(<Servicos />);
    await screen.findByText('Clínica Patas');
    await fireEvent.press(screen.getByText('Perto de mim'));
    expect(await screen.findByText('800 m')).toBeOnTheScreen();
    expect(get).toHaveBeenLastCalledWith('/empresas', {
      params: {
        query: {
          busca: undefined,
          categoria: undefined,
          pagina: 1,
          tamanho: 30,
          perto: true,
          latitude: -23.56,
          longitude: -46.65,
        },
      },
    });
  });

  it('deve avisar quando a busca falha', async () => {
    jest
      .spyOn(api, 'GET')
      .mockImplementation(() =>
        Promise.resolve({ error: {}, response: new Response(null, { status: 500 }) } as unknown as Resposta),
      );
    await render(<Servicos />);
    expect(await screen.findByText('Busca indisponível')).toBeOnTheScreen();
  });

  it('deve mostrar o catálogo com preço e duração no perfil da empresa', async () => {
    jest.spyOn(api, 'GET').mockImplementation(((caminho: string) =>
      caminho === '/empresas/{empresaId}'
        ? ok(clinica)
        : ok([
            {
              id: 's1',
              nome: 'Consulta clínica',
              descricao: 'Avaliação geral',
              categoria: 'CONSULTA',
              preco: 150,
              duracaoMinutos: 45,
              ativo: true,
            },
            {
              id: 's2',
              nome: 'Antigo',
              descricao: 'Fora do ar',
              categoria: 'OUTRO',
              preco: 1,
              duracaoMinutos: 5,
              ativo: false,
            },
          ])) as typeof api.GET);
    await render(<PerfilEmpresa />);
    expect(await screen.findByText('Consulta clínica')).toBeOnTheScreen();
    expect(screen.getByText('R$ 150,00')).toBeOnTheScreen();
    expect(screen.getByText('45 min')).toBeOnTheScreen();
    expect(screen.queryByText('Antigo')).not.toBeOnTheScreen();
    expect(screen.getByText('Clínica veterinária · Centro, Curitiba - PR')).toBeOnTheScreen();
  });

  it('deve avisar quando a empresa não existe mais', async () => {
    jest
      .spyOn(api, 'GET')
      .mockImplementation(() =>
        Promise.resolve({ error: {}, response: new Response(null, { status: 404 }) } as unknown as Resposta),
      );
    await render(<PerfilEmpresa />);
    expect(await screen.findByText('Esta empresa não está mais disponível.')).toBeOnTheScreen();
  });
});
