import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import { LembretesDeServico, QuemCuidaHoje } from './QuemCuidaHoje';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

type Qualquer = Awaited<ReturnType<typeof api.PUT>>;
const ok = () => Promise.resolve({ data: {}, response: new Response(null, { status: 200 }) } as unknown as Qualquer);

const pet = {
  id: 'p1',
  nome: 'Thor',
  especie: 'Cachorro',
  fotoUrl: null,
  itens: [],
  responsaveis: [
    { tutorId: 't1', nome: 'Ana' },
    { tutorId: 't2', nome: 'Pedro' },
  ],
  cuidadorHoje: { tutorId: 't2', nome: 'Pedro', souEu: false },
};

describe('Quem cuida hoje e lembretes de serviço', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve mostrar quem cuida e deixar ficar com o dia', async () => {
    const put = jest.spyOn(api, 'PUT').mockImplementation(() => ok() as never);
    const aoMudar = jest.fn();
    await render(<QuemCuidaHoje pet={pet} aoMudar={aoMudar} />);
    expect(screen.getByText('Pedro cuida hoje')).toBeTruthy();
    await fireEvent.press(screen.getByText('Eu cuido hoje'));
    expect(put).toHaveBeenCalledWith('/pets/{petId}/cuidador-hoje', { params: { path: { petId: 'p1' } }, body: {} });
    expect(aoMudar).toHaveBeenCalled();
  });

  it('não deve aparecer com um responsável só', async () => {
    await render(<QuemCuidaHoje pet={{ ...pet, responsaveis: [pet.responsaveis[0]] }} aoMudar={jest.fn()} />);
    expect(screen.queryByText(/cuida hoje/)).toBeNull();
  });

  it('deve levar o lembrete de banho ao agendamento com o pet escolhido', async () => {
    await render(
      <LembretesDeServico
        sugestoes={[
          {
            petId: 'p1',
            petNome: 'Thor',
            servicoId: 's1',
            servicoNome: 'Banho',
            empresaNome: 'Patas',
            diasDesde: 70,
            texto: 'Faz 2 meses do último banho de Thor na Patas.',
          },
        ]}
      />,
    );
    await fireEvent.press(screen.getByText('Agendar de novo'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/solicitar/[servicoId]',
      params: { servicoId: 's1', petId: 'p1', servico: 'Banho', empresa: 'Patas' },
    });
  });
});
