import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Abas, Alerta, Botao, Campo } from '.';

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

describe('Abas', () => {
  const abas = [
    { chave: 'rotina', rotulo: 'Rotina', contador: 3 },
    { chave: 'agenda', rotulo: 'Agenda' },
  ] as const;

  it('deve marcar a aba ativa e anunciar o contador', async () => {
    await render(<Abas abas={abas} ativa="rotina" aoMudar={jest.fn()} rotulo="Partes do dia" />);
    expect(screen.getByRole('tab', { name: 'Rotina, 3' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Agenda' })).not.toBeSelected();
  });

  it('deve avisar a troca de aba quando o tutor toca em outra', async () => {
    const aoMudar = jest.fn();
    await render(<Abas abas={abas} ativa="rotina" aoMudar={aoMudar} rotulo="Partes do dia" />);
    await fireEvent.press(screen.getByRole('tab', { name: 'Agenda' }));
    expect(aoMudar).toHaveBeenCalledWith('agenda');
  });
});
