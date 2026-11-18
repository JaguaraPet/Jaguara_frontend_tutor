import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alerta, Botao, Campo } from '.';

describe('Botao', () => {
  it('deve chamar a ação quando é tocado', async () => {
    const aoTocar = jest.fn();
    await render(<Botao titulo="Salvar" onPress={aoTocar} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar' }));
    expect(aoTocar).toHaveBeenCalledTimes(1);
  });

  it('não deve chamar a ação quando está desabilitado', async () => {
    const aoTocar = jest.fn();
    await render(<Botao titulo="Salvar" disabled onPress={aoTocar} />);
    const botao = screen.getByRole('button', { name: 'Salvar' });
    expect(botao).toBeDisabled();
    await fireEvent.press(botao);
    expect(aoTocar).not.toHaveBeenCalled();
  });

  it('deve ficar ocupado e desabilitado quando está carregando', async () => {
    await render(<Botao titulo="Enviar" carregando />);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeBusy();
  });
});

describe('Campo', () => {
  it('deve mostrar o rótulo sempre visível', async () => {
    await render(<Campo rotulo="Nome do pet" />);
    expect(screen.getByText('Nome do pet')).toBeOnTheScreen();
  });

  it('deve anunciar a mensagem de erro quando há erro', async () => {
    await render(<Campo rotulo="CPF" erro="CPF inválido." />);
    expect(screen.getByRole('alert')).toHaveTextContent('CPF inválido.');
  });
});

describe('Alerta', () => {
  it('deve trazer texto além da cor quando mostra uma alergia grave', async () => {
    await render(<Alerta tipo="erro" titulo="Alergia grave" mensagem="Dipirona" />);
    expect(screen.getByRole('alert')).toHaveAccessibleName('Erro: Alergia grave. Dipirona');
  });
});
