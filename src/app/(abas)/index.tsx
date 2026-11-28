import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, View } from 'react-native';
import { api } from '../../api/cliente';
import { AvaliarAtendimentos } from '../../avaliacao/AvaliarAtendimentos';
import { Comemoracoes } from '../../pets/Comemoracoes';
import { EscolhaDePet } from '../../pets/EscolhaDePet';
import { LembretesDeServico, QuemCuidaHoje } from '../../pets/QuemCuidaHoje';
import type { components } from '../../api/esquema';
import { Abas, Alerta, Botao, Cartao, Icone, PainelDaAba, Tela, Texto } from '../../componentes';
import type { Aba, NomeIcone } from '../../componentes';
import { cores, espaco } from '../../tema/tokens';
import { criarEstilos } from '../../tema/estilos';

type Hoje = components['schemas']['HojeTutor'];
type Item = components['schemas']['ItemDoDia'];
type AbaDoInicio = 'rotina' | 'agenda' | 'vacinas';

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const diaHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
const dataCurta = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

/** "Domingo, 22 de novembro", no fuso de Brasília. */
function dataDeHoje(): string {
  const t = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  });
  const [dia, ...resto] = t.split(', ');
  return [dia.charAt(0).toUpperCase() + dia.slice(1), ...resto].join(', ');
}

function saudacao(): string {
  const h = Number(new Date().toLocaleString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }));
  if (h < 12) return 'Bom dia!';
  if (h < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

const ATALHOS = [
  { rotulo: 'Nova rotina', destino: 'rotinas', icone: 'repeat' },
  { rotulo: 'Refeição', destino: 'alimentacao', icone: 'bowl-mix-outline' },
  { rotulo: 'Remédio', destino: 'medicamentos', icone: 'pill' },
  { rotulo: 'Vacina', destino: 'vacinas', icone: 'needle' },
  { rotulo: 'Despesa', destino: 'despesas', icone: 'receipt-text-outline' },
] as const satisfies readonly { rotulo: string; destino: string; icone: NomeIcone }[];

/** Um item do dia: remédio ("Dei") ou rotina ("Feito"), com quem já fez. */
function LinhaDoDia({ item, aoMudar }: { item: Item; aoMudar: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const remedio = item.tipo === 'REMEDIO';

  async function alternar() {
    setEnviando(true);
    if (remedio && item.previstaPara) {
      const caminho = { params: { path: { tratamentoId: item.id } } };
      if (item.feito) {
        await api.DELETE('/tratamentos/{tratamentoId}/doses', {
          params: { path: { tratamentoId: item.id }, query: { previstaPara: item.previstaPara } },
        });
      } else {
        await api.POST('/tratamentos/{tratamentoId}/doses', { ...caminho, body: { previstaPara: item.previstaPara } });
      }
    } else if (item.feito) {
      await api.DELETE('/rotinas/{rotinaId}/feitos', {
        params: {
          path: { rotinaId: item.id },
          query: { data: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), ...(item.horario ? { horario: item.horario } : {}) },
        },
      });
    } else {
      await api.POST('/rotinas/{rotinaId}/feitos', {
        params: { path: { rotinaId: item.id } },
        body: item.horario ? { horario: item.horario } : {},
      });
    }
    setEnviando(false);
    aoMudar();
  }

  return (
    <View style={[estilos.linha, item.feito && estilos.linhaFeita]}>
      <Texto style={estilos.hora}>{item.horario ?? 'Hoje'}</Texto>
      <View style={estilos.linhaCorpo}>
        <View style={estilos.comIcone}>
          {remedio && <Icone nome="pill" tamanho={16} cor={cores.secundaria} />}
          <Texto style={item.feito ? estilos.tituloFeito : undefined}>{item.titulo}</Texto>
        </View>
        {item.detalhe ? (
          <Texto variante="legenda" cor={cores.textoSecundario}>
            {item.detalhe}
          </Texto>
        ) : null}
        {item.feito && (
          <View style={estilos.comIcone}>
            <Icone nome="check" tamanho={14} cor={cores.sucesso} />
            <Texto variante="legenda" cor={cores.sucesso}>
              {remedio ? 'Dado' : 'Feito'}
              {item.feitoPor ? ` por ${item.feitoPor}` : ''}
              {item.feitoEm ? ` às ${hora(item.feitoEm)}` : ''}
            </Texto>
          </View>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.feito ? `Desfazer ${item.titulo}` : `${remedio ? 'Dei' : 'Feito'}: ${item.titulo}`}
        onPress={() => void alternar()}
        disabled={enviando}
        style={({ pressed }) => [estilos.marcar, item.feito && estilos.marcarFeito, pressed && { opacity: 0.7 }]}
      >
        {enviando ? (
          <ActivityIndicator color={item.feito ? cores.sobreCor : cores.secundaria} />
        ) : item.feito ? (
          <Icone nome="check" tamanho={20} cor={cores.sobreCor} />
        ) : (
          <Texto style={estilos.marcarTexto}>{remedio ? 'Dei' : 'Feito'}</Texto>
        )}
      </Pressable>
    </View>
  );
}

/**
 * Início do tutor: o dia de cada pet. Remédios e rotinas com "Dei" e "Feito" num toque, e quem
 * da família já fez; os próximos agendamentos com a confirmação de presença; as vacinas que
 * vencem. É o motivo para abrir o app todo dia.
 */
export default function Inicio() {
  const [hoje, setHoje] = useState<Hoje | null>(null);
  const [petId, setPetId] = useState<string>('');
  const [versao, setVersao] = useState(0);
  const [mais, setMais] = useState(false);
  const [aba, setAba] = useState<AbaDoInicio>('rotina');
  const recarregar = () => setVersao((v) => v + 1);

  useFocusEffect(useCallback(() => setVersao((v) => v + 1), []));

  useEffect(() => {
    let ativo = true;
    void api.GET('/tutor/hoje').then(({ data }) => {
      if (ativo && data) setHoje(data);
    });
    return () => {
      ativo = false;
    };
  }, [versao]);

  if (!hoje) {
    return (
      <Tela titulo={saudacao()}>
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando o dia" />
      </Tela>
    );
  }

  if (hoje.pets.length === 0) {
    return (
      <Tela titulo={saudacao()} subtitulo="Vamos começar pelo seu pet.">
        <Cartao titulo="Cadastre seu primeiro pet" subtitulo="Com ele, o app monta o dia: remédios, rotinas, vacinas e consultas.">
          <Botao titulo="Cadastrar pet" larguraTotal onPress={() => router.push('/pets/novo')} />
        </Cartao>
        <Cartao titulo="Encontrar uma clínica ou pet shop" aoTocar={() => router.push('/servicos')} />
      </Tela>
    );
  }

  const selecionados = petId ? hoje.pets.filter((p) => p.id === petId) : hoje.pets;
  const nomePet = (id: string) => hoje.pets.find((p) => p.id === id)?.nome ?? '';
  const agendamentos = hoje.agendamentos.filter((a) => !petId || a.petId === petId);
  const vacinas = hoje.vacinas.filter((v) => !petId || v.petId === petId);
  const pendentes = selecionados.flatMap((p) => p.itens).filter((i) => !i.feito).length;
  const petDoAtalho = petId || hoje.pets[0].id;

  async function confirmar(id: string) {
    await api.POST('/agendamentos/{agendamentoId}/confirmacao', { params: { path: { agendamentoId: id } } });
    recarregar();
  }

  const fotos = Object.fromEntries(hoje.pets.map((p) => [p.id, p.fotoUrl]));
  const vacinasAtrasadas = vacinas.filter((v) => v.atrasada).length;
  const abas: Aba<AbaDoInicio>[] = [
    { chave: 'rotina', rotulo: 'Rotina', contador: pendentes },
    { chave: 'agenda', rotulo: 'Agenda', contador: agendamentos.filter((a) => !a.confirmado).length },
    { chave: 'vacinas', rotulo: 'Vacinas', contador: vacinasAtrasadas },
  ];

  return (
    <View style={estilos.raiz}>
      <Tela
        sobretitulo={dataDeHoje()}
        titulo={saudacao()}
        subtitulo={pendentes === 0 ? 'Tudo feito por hoje.' : `${pendentes} ${pendentes === 1 ? 'coisa' : 'coisas'} para hoje.`}
        acessorio={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notificações"
            onPress={() => router.push('/notificacoes')}
            style={({ pressed }) => [estilos.sino, pressed && { backgroundColor: cores.superficie }]}
          >
            <Icone nome="bell-outline" tamanho={22} cor={cores.destaque} />
          </Pressable>
        }
      >
        {hoje.pets.length > 1 && <EscolhaDePet pets={hoje.pets} petId={petId} aoMudar={setPetId} />}

        <Comemoracoes
          celebracoes={(hoje.celebracoes ?? []).filter((c) => !petId || c.petId === petId)}
          fotos={fotos}
        />

        <Abas abas={abas} ativa={aba} aoMudar={setAba} rotulo="Partes do dia" />

        <PainelDaAba chave={aba}>
          {aba === 'rotina' &&
            selecionados.map((p) => (
              <Cartao key={p.id} titulo={p.nome}>
                <QuemCuidaHoje pet={p} aoMudar={recarregar} />
                {p.itens.length === 0 ? (
                  <View style={estilos.vazio}>
                    <Texto cor={cores.textoSecundario}>Nada marcado para hoje.</Texto>
                    <Botao
                      titulo="Criar uma rotina"
                      variante="texto"
                      icone="plus"
                      onPress={() => router.push({ pathname: '/pets/[petId]/rotinas', params: { petId: p.id } })}
                    />
                  </View>
                ) : (
                  p.itens.map((i) => (
                    <LinhaDoDia key={`${i.tipo}-${i.id}-${i.horario ?? ''}`} item={i} aoMudar={recarregar} />
                  ))
                )}
              </Cartao>
            ))}

          {aba === 'agenda' && (
            <>
              {agendamentos.length > 0 ? (
                <Cartao titulo="Próximos agendamentos">
                  {agendamentos.map((a) => (
                    <View key={a.id} style={estilos.agendamento}>
                      <View style={estilos.linhaCorpo}>
                        <Texto>
                          {a.servicoNome} · {a.petNome}
                        </Texto>
                        <Texto variante="legenda" cor={cores.textoSecundario}>
                          {diaHora(a.inicio)} · {a.empresaNome}
                        </Texto>
                      </View>
                      {a.confirmado ? (
                        <View style={estilos.comIcone}>
                          <Icone nome="check-circle" tamanho={16} cor={cores.sucesso} />
                          <Texto variante="legenda" cor={cores.sucesso}>
                            Confirmado
                          </Texto>
                        </View>
                      ) : (
                        <Botao titulo="Confirmar" variante="secundaria" onPress={() => void confirmar(a.id)} />
                      )}
                    </View>
                  ))}
                </Cartao>
              ) : (
                <Cartao titulo="Nenhum agendamento por vir" subtitulo="Agende banho, consulta ou vacina pela aba Serviços.">
                  <Botao titulo="Agendar um serviço" icone="calendar-plus" variante="secundaria" onPress={() => router.push('/servicos')} />
                </Cartao>
              )}
              <LembretesDeServico sugestoes={(hoje.sugestoes ?? []).filter((s) => !petId || s.petId === petId)} />
              <AvaliarAtendimentos versao={versao} />
            </>
          )}

          {aba === 'vacinas' && (
            <>
              {vacinasAtrasadas > 0 && (
                <Alerta
                  tipo="alerta"
                  titulo="Tem vacina atrasada"
                  mensagem="Agende pela aba Serviços. A clínica registra a vacina e ela chega aqui com o selo."
                />
              )}
              {vacinas.length > 0 ? (
                <Cartao titulo="Vacinas">
                  {vacinas.map((v) => (
                    <Pressable
                      key={`${v.petId}-${v.vacina}`}
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: '/pets/[petId]/vacinas', params: { petId: v.petId } })}
                      style={({ pressed }) => [estilos.vacina, pressed && { opacity: 0.7 }]}
                    >
                      <View style={estilos.linhaCorpo}>
                        <View style={estilos.comIcone}>
                          <Icone nome="needle" tamanho={16} cor={cores.secundaria} />
                          <Texto>
                            {v.vacina} · {nomePet(v.petId)}
                          </Texto>
                        </View>
                        <Texto variante="legenda" cor={v.atrasada ? cores.erro : cores.alerta}>
                          {v.atrasada ? `Atrasada desde ${dataCurta(v.proximaDose)}` : `Vence em ${dataCurta(v.proximaDose)}`}
                        </Texto>
                      </View>
                      <Icone nome="chevron-right" tamanho={20} cor={cores.textoSecundario} />
                    </Pressable>
                  ))}
                </Cartao>
              ) : (
                <Cartao titulo="Vacinas em dia" subtitulo="Nenhuma vacina vence neste mês." />
              )}
            </>
          )}
        </PainelDaAba>
        <View style={{ height: 88 }} />
      </Tela>

      <BotaoMais
        aberto={mais}
        aoAlternar={() => setMais((m) => !m)}
        nomePet={nomePet(petDoAtalho)}
        aoEscolher={(destino) => {
          setMais(false);
          if (destino === 'servicos') router.push('/servicos');
          else if (destino === 'novo-pet') router.push('/pets/novo');
          else router.push({ pathname: `/pets/[petId]/${destino}`, params: { petId: petDoAtalho } });
        }}
      />
    </View>
  );
}

type Destino = (typeof ATALHOS)[number]['destino'] | 'servicos' | 'novo-pet';

const GERAIS = [
  { rotulo: 'Agendar um serviço', destino: 'servicos', icone: 'calendar-plus' },
  { rotulo: 'Cadastrar outro pet', destino: 'novo-pet', icone: 'paw' },
] as const satisfies readonly { rotulo: string; destino: Destino; icone: NomeIcone }[];

/**
 * Botão de + fixo no canto: abre as ações principais. O + gira e vira um X, e os atalhos sobem
 * um a um.
 */
function BotaoMais({
  aberto,
  aoAlternar,
  aoEscolher,
  nomePet,
}: {
  aberto: boolean;
  aoAlternar: () => void;
  aoEscolher: (destino: Destino) => void;
  nomePet: string;
}) {
  const [giro] = useState(() => new Animated.Value(0));
  const itens = [...ATALHOS, ...GERAIS];
  const [entradas] = useState(() => itens.map(() => new Animated.Value(0)));

  useEffect(() => {
    Animated.spring(giro, { toValue: aberto ? 1 : 0, useNativeDriver: true, friction: 6 }).start();
    if (aberto) {
      entradas.forEach((e) => e.setValue(0));
      Animated.stagger(
        35,
        [...entradas].reverse().map((e) => Animated.timing(e, { toValue: 1, duration: 180, useNativeDriver: true })),
      ).start();
    }
  }, [aberto, giro, entradas]);

  const item = (a: (typeof itens)[number], i: number) => (
    <Animated.View
      key={a.destino}
      style={{
        opacity: entradas[i],
        transform: [{ translateY: entradas[i].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [estilos.menuItem, pressed && { backgroundColor: cores.superficie }]}
        onPress={() => aoEscolher(a.destino)}
      >
        <View style={estilos.menuIcone}>
          <Icone nome={a.icone} tamanho={20} cor={cores.secundaria} />
        </View>
        <Texto negrito>{a.rotulo}</Texto>
      </Pressable>
    </Animated.View>
  );

  return (
    <>
      {aberto && (
        <Pressable style={estilos.fundoMenu} accessibilityLabel="Fechar atalhos" onPress={aoAlternar}>
          <View style={estilos.menu}>
            <Texto variante="legenda" cor={cores.textoSecundario} style={estilos.menuGrupo}>
              Registrar para {nomePet}
            </Texto>
            {ATALHOS.map((a, i) => item(a, i))}
            <View style={estilos.menuDivisor} />
            {GERAIS.map((a, i) => item(a, ATALHOS.length + i))}
          </View>
        </Pressable>
      )}
      <Animated.View
        style={[
          estilos.mais,
          { transform: [{ rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] }) }] },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={aberto ? 'Fechar atalhos' : 'Ações principais'}
          accessibilityState={{ expanded: aberto }}
          onPress={aoAlternar}
          style={({ pressed }) => [estilos.maisToque, pressed && { backgroundColor: cores.primariaEscura }]}
        >
          <Icone nome="plus" tamanho={30} cor={cores.sobrePrimaria} />
        </Pressable>
      </Animated.View>
    </>
  );
}

const estilos = criarEstilos(() => ({
  raiz: { flex: 1 },
  comIcone: { flexDirection: 'row', alignItems: 'center', gap: espaco.xs },
  sino: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: cores.cartaoBorda,
    backgroundColor: cores.cartao,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.sm,
    borderTopWidth: 1,
    borderTopColor: cores.cartaoBorda,
  },
  linhaFeita: { opacity: 0.75 },
  hora: { width: 48, fontWeight: '700' },
  linhaCorpo: { flex: 1, gap: 2 },
  tituloFeito: { textDecorationLine: 'line-through', color: cores.textoSecundario },
  marcar: {
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: espaco.md,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: cores.secundaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marcarFeito: { backgroundColor: cores.sucesso, borderColor: cores.sucesso },
  marcarTexto: { fontWeight: '700', color: cores.secundaria },
  vazio: { gap: espaco.xs },
  agendamento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.sm,
    borderTopWidth: 1,
    borderTopColor: cores.cartaoBorda,
  },
  vacina: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.sm,
    borderTopWidth: 1,
    borderTopColor: cores.cartaoBorda,
  },
  mais: {
    position: 'absolute',
    right: espaco.xl,
    bottom: espaco.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  maisToque: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundoMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: cores.veu,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: espaco.xl,
    paddingBottom: 96,
  },
  menu: {
    minWidth: 240,
    padding: espaco.md,
    gap: 2,
    borderRadius: 20,
    backgroundColor: cores.elevado,
    borderWidth: 1,
    borderColor: cores.cartaoBorda,
  },
  menuGrupo: { paddingHorizontal: espaco.sm, paddingBottom: espaco.xs },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    minHeight: 48,
    paddingHorizontal: espaco.sm,
    borderRadius: 12,
  },
  menuIcone: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.superficie,
  },
  menuDivisor: { height: 1, marginVertical: espaco.xs, backgroundColor: cores.cartaoBorda },
}));

