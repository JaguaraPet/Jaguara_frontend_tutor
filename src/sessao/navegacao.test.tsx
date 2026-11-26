import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { api } from '../api/cliente';
import type { ReactNode } from 'react';
import LayoutAbas from '../app/(abas)/_layout';
import { sessao } from './sessao';
import type { Usuario } from './sessao';

// O layout só precisa saber para onde redireciona e quais abas declara.
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: TextoMock } = require('react-native') as typeof import('react-native');
  const Tabs = ({ children }: { children: ReactNode }) => children;
  Tabs.Screen = function Aba({ options }: { options: { title: string } }) {
    return <TextoMock accessibilityLabel={options.title}>{options.title}</TextoMock>;
  };
  return {
    Redirect: function Redirecionar({ href }: { href: string }) {
      return <TextoMock>{`Redireciona para ${href}`}</TextoMock>;
    },
    Tabs,
  };
});

type Qualquer = Awaited<ReturnType<typeof api.GET>>;
const consentimentos = (lista: unknown[]) =>
  jest
    .spyOn(api, 'GET')
    .mockImplementation(() => Promise.resolve({ data: lista, response: new Response(null) } as unknown as Qualquer) as never);
const tutor: Usuario = { id: 't1', tipo: 'TUTOR', perfil: 'Tutor', permissoes: [] };

describe('Navegação do app (UX-01)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve mandar para as boas-vindas quando não há sessão (rota protegida)', async () => {
    jest.spyOn(sessao, 'usuario', 'get').mockReturnValue(null);
    await render(<LayoutAbas />);
    expect(screen.getByText('Redireciona para /boas-vindas')).toBeOnTheScreen();
  });

  it('deve mostrar as cinco abas quando o tutor está logado', async () => {
    consentimentos([{ termoId: 'tu1', obrigatorio: true, aceito: true }]);
    jest.spyOn(sessao, 'usuario', 'get').mockReturnValue(tutor);
    await render(<LayoutAbas />);
    for (const aba of ['Início', 'Pets', 'Agenda', 'Serviços', 'Perfil']) {
      expect(screen.getByLabelText(aba)).toBeOnTheScreen();
    }
  });

  it('CT-46-03: deve pedir o aceite da versão nova do termo antes das abas', async () => {
    consentimentos([{ termoId: 'tu2', obrigatorio: true, aceito: false }]);
    jest.spyOn(sessao, 'usuario', 'get').mockReturnValue(tutor);
    await render(<LayoutAbas />);
    expect(await screen.findByText('Redireciona para /termos-pendentes')).toBeOnTheScreen();
  });
});
