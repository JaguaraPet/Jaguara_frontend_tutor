import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EscolhaDePet } from './EscolhaDePet';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() } }));

const pet = (id: string, nome: string) => ({ id, nome, especie: 'Cachorro', fotoUrl: null });

describe('Escolha de pet no Hoje', () => {
  it('deve mostrar até 3 pets em pílulas, em ordem alfabética', async () => {
    const aoMudar = jest.fn();
    await render(<EscolhaDePet pets={[pet('2', 'Mel'), pet('1', 'Bento')]} petId="" aoMudar={aoMudar} />);
    const nomes = screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel as string);
    expect(nomes).toEqual(['Todos', 'Bento', 'Mel']);
    await fireEvent.press(screen.getByRole('radio', { name: 'Mel' }));
    expect(aoMudar).toHaveBeenCalledWith('2');
  });

  it('deve abrir uma janela com a lista quando há 4 pets ou mais', async () => {
    const aoMudar = jest.fn();
    const pets = [pet('1', 'Thor'), pet('2', 'Bolota'), pet('3', 'Kiwi'), pet('4', 'Bento')];
    await render(<EscolhaDePet pets={pets} petId="" aoMudar={aoMudar} />);
    expect(screen.queryByRole('radio')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Pet: todos. Trocar' }));
    expect(await screen.findByText('Ver o dia de qual pet?')).toBeOnTheScreen();
    const nomes = screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel as string);
    expect(nomes).toEqual(['Todos os pets', 'Bento', 'Bolota', 'Kiwi', 'Thor']);
    await fireEvent.press(screen.getByRole('radio', { name: 'Kiwi' }));
    expect(aoMudar).toHaveBeenCalledWith('3');
  });
});
