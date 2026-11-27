import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import Pets from '../app/(abas)/pets';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (efeito: () => void) => require('react').useEffect(efeito, [efeito]),
}));

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const resposta = (data: unknown, status = 200) =>
  Promise.resolve({
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined,
    response: new Response(null, { status }),
  } as unknown as Qualquer);

const thor = { id: 'p1', nome: 'Thor', especie: 'Cão', raca: 'Labrador', idade: 3, status: 'ATIVO', sexo: 'MACHO', castrado: true };
const mia = { id: 'p2', nome: 'Mia', especie: 'Gato', raca: 'SRD', idade: 0, status: 'ARQUIVADO', sexo: 'FEMEA', castrado: false };

describe('UC-04 · Lista de pets no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve listar os pets ativos com espécie, raça e idade e abrir o perfil', async () => {
    const get = jest.spyOn(api, 'GET').mockImplementation(() => resposta({ itens: [thor], total: 1, pagina: 1 }) as never);
    await render(<Pets />);
    expect(await screen.findByText('Thor')).toBeOnTheScreen();
    expect(screen.getByText('Cão · Labrador · 3 anos')).toBeOnTheScreen();
    expect(get).toHaveBeenCalledWith('/pets', { params: { query: { status: 'ATIVO', tamanho: 50 } } });
    await fireEvent.press(screen.getByLabelText('Abrir o perfil de Thor'));
    expect(router.push).toHaveBeenCalledWith('/pets/p1');
  });

  it('deve filtrar os arquivados', async () => {
    const get = jest
      .spyOn(api, 'GET')
      .mockImplementation(((_: string, op: { params: { query: { status: string } } }) =>
        resposta({ itens: op.params.query.status === 'ARQUIVADO' ? [mia] : [thor], total: 1, pagina: 1 })) as never);
    await render(<Pets />);
    await screen.findByText('Thor');
    await fireEvent.press(screen.getByRole('radio', { name: 'Arquivados' }));
    expect(await screen.findByText('Mia')).toBeOnTheScreen();
    expect(screen.getByText('Gato · SRD · menos de 1 ano')).toBeOnTheScreen();
    expect(get).toHaveBeenLastCalledWith('/pets', { params: { query: { status: 'ARQUIVADO', tamanho: 50 } } });
  });

  it('deve convidar a cadastrar quando não há pets', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta({ itens: [], total: 0, pagina: 1 }) as never);
    await render(<Pets />);
    expect(await screen.findByText('Você ainda não cadastrou pets.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Cadastrar pet'));
    expect(router.push).toHaveBeenCalledWith('/pets/novo');
  });

  it('deve avisar quando a API falha', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => resposta({ title: 'Erro' }, 503) as never);
    await render(<Pets />);
    expect(await screen.findByText(/Não foi possível carregar os pets/)).toBeOnTheScreen();
  });
});
