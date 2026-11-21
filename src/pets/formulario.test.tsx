import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../api/cliente';
import NovoPet from '../app/pets/novo';
import { dataBr, dataIso, mascararData, paraEntrada, validar, VAZIO } from './formulario';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ petId: 'p1' }),
}));

type Resposta = Awaited<ReturnType<typeof api.GET>>;
const ok = (data: unknown) =>
  Promise.resolve({ data, response: new Response(null, { status: 200 }) } as unknown as Resposta);

const especies = [
  { id: 'cao', nome: 'Cachorro', racas: [{ id: 'srd', nome: 'SRD' }, { id: 'lab', nome: 'Labrador' }] },
  { id: 'gato', nome: 'Gato', racas: [{ id: 'siames', nome: 'Siamês' }] },
];

describe('UC-04 · Cadastro e edição do pet no app', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('deve converter e mascarar a data de nascimento', () => {
    expect(dataIso('05/03/2021')).toBe('2021-03-05');
    expect(dataIso('31/02/2021')).toBeNull();
    expect(dataIso('2021-03-05')).toBeNull();
    expect(dataBr('2021-03-05')).toBe('05/03/2021');
    expect(dataBr()).toBe('');
    expect(mascararData('05032021')).toBe('05/03/2021');
    expect(mascararData('0503')).toBe('05/03');
  });

  it('deve dizer o que falta ou está errado', () => {
    const hoje = '2026-11-21';
    expect(validar(VAZIO, hoje)).toEqual({
      nome: 'Informe o nome do pet.',
      especieId: 'Escolha a espécie.',
      sexo: 'Escolha o sexo.',
    });
    const valido = { ...VAZIO, nome: 'Thor', especieId: 'cao', racaId: 'srd', sexo: 'MACHO' as const };
    expect(validar(valido, hoje)).toEqual({});
    expect(validar({ ...valido, racaId: '' }, hoje).racaId).toBeDefined();
    expect(validar({ ...valido, nascimento: '01/01/2030' }, hoje).nascimento).toContain('futura');
    expect(validar({ ...valido, peso: '0' }, hoje).peso).toBeDefined();
  });

  it('deve montar o corpo só com o que foi preenchido', () => {
    expect(
      paraEntrada({
        ...VAZIO,
        nome: ' Thor ',
        especieId: 'cao',
        racaId: 'srd',
        sexo: 'MACHO',
        nascimento: '05/03/2021',
        peso: '12,5',
        castrado: true,
      }),
    ).toEqual({
      nome: 'Thor',
      racaId: 'srd',
      sexo: 'MACHO',
      castrado: true,
      dataNascimento: '2021-03-05',
      pesoKg: 12.5,
    });
  });

  it('deve cadastrar o pet escolhendo espécie, raça e sexo', async () => {
    jest.spyOn(api, 'GET').mockImplementation(() => ok(especies));
    const post = jest
      .spyOn(api, 'POST')
      .mockImplementation(() => ok({ id: 'p9' }) as unknown as ReturnType<typeof api.POST>);
    await render(<NovoPet />);
    await screen.findByText('Cachorro');
    await fireEvent.press(screen.getByRole('button', { name: 'Cadastrar pet' }));
    expect(await screen.findByText('Informe o nome do pet.')).toBeOnTheScreen();
    expect(post).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Nome'), 'Thor');
    await fireEvent.press(screen.getByLabelText('Cachorro'));
    await fireEvent.press(screen.getByLabelText('Labrador'));
    await fireEvent.press(screen.getByLabelText('Macho'));
    await fireEvent.press(screen.getByRole('button', { name: 'Cadastrar pet' }));
    expect(post).toHaveBeenCalledWith('/pets', {
      body: { nome: 'Thor', racaId: 'lab', sexo: 'MACHO', castrado: false },
    });
    expect(router.replace).toHaveBeenCalledWith('/pets/p9/editar?novo=1');
  });
});
