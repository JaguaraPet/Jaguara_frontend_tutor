import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { registrarAparelho } from '../../notificacoes/push';
import { temTermoPendente } from '../../privacidade/termos';
import { useUsuario } from '../../sessao/useUsuario';
import { familiaPorPeso } from '../../tema/fontes';
import { cores } from '../../tema/tokens';

type NomeIcone = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Abas do app do tutor (UX-01, seção 3). */
const abas: { nome: string; titulo: string; icone: NomeIcone }[] = [
  { nome: 'index', titulo: 'Início', icone: 'home' },
  { nome: 'pets', titulo: 'Pets', icone: 'paw' },
  { nome: 'agenda', titulo: 'Agenda', icone: 'calendar-month' },
  { nome: 'servicos', titulo: 'Serviços', icone: 'storefront' },
  { nome: 'perfil', titulo: 'Perfil', icone: 'account-circle' },
];

/** As abas exigem login: sem sessão, o tutor vai para as boas-vindas. */
export default function LayoutAbas() {
  const usuario = useUsuario();
  const usuarioId = usuario?.id;
  const [termoPendente, setTermoPendente] = useState(false);

  // Com a sessão aberta, registra o aparelho para os lembretes por push (UC-31).
  useEffect(() => {
    if (usuarioId) void registrarAparelho().catch(() => null);
  }, [usuarioId]);

  // CT-46-03: versão nova de termo obrigatório pede aceite antes das demais telas.
  useEffect(() => {
    if (usuarioId) void temTermoPendente().then(setTermoPendente).catch(() => null);
  }, [usuarioId]);

  if (!usuario) return <Redirect href="/boas-vindas" />;
  if (termoPendente) return <Redirect href="/termos-pendentes" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cores.destaque,
        tabBarInactiveTintColor: cores.textoSecundario,
        tabBarLabelStyle: { fontFamily: familiaPorPeso('600'), fontSize: 12 },
        tabBarStyle: { minHeight: 64, backgroundColor: cores.barra, borderTopColor: cores.borda },
      }}
    >
      {abas.map((aba) => (
        <Tabs.Screen
          key={aba.nome}
          name={aba.nome}
          options={{
            title: aba.titulo,
            tabBarAccessibilityLabel: aba.titulo,
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialCommunityIcons
                name={focused ? aba.icone : (`${aba.icone}-outline` as NomeIcone)}
                size={size}
                color={color as string}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
