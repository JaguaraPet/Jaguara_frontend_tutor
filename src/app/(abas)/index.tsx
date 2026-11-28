import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { api } from '../../api/cliente';
import { AvaliarAtendimentos } from '../../avaliacao/AvaliarAtendimentos';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Cartao, Tela, Texto } from '../../componentes';
import { cores, espaco } from '../../tema/tokens';

type Hoje = components['schemas']['HojeTutor'];
type PetDoDia = Hoje['pets'][number];
type Item = components['schemas']['ItemDoDia'];

const ICONE: Record<string, string> = {
  Cachorro: '🐶',
  Gato: '🐱',
  Ave: '🐦',
  Roedor: '🐹',
  Coelho: '🐰',
  Réptil: '🦎',
  Peixe: '🐟',
};
const icone = (especie: string) => ICONE[especie] ?? '🐾';

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

function saudacao(): string {
  const h = Number(new Date().toLocaleString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }));
  if (h < 12) return 'Bom dia!';
  if (h < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

const ATALHOS = [
  { rotulo: 'Nova rotina', destino: 'rotinas', icone: '🔁' },
  { rotulo: 'Refeição', destino: 'alimentacao', icone: '🥣' },
  { rotulo: 'Remédio', destino: 'medicamentos', icone: '💊' },
  { rotulo: 'Vacina', destino: 'vacinas', icone: '💉' },
  { rotulo: 'Despesa', destino: 'despesas', icone: '🧾' },
] as const;

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
        <Texto style={item.feito ? estilos.tituloFeito : undefined}>
          {remedio ? '💊 ' : ''}
          {item.titulo}
        </Texto>
        {item.detalhe ? (
          <Texto variante="legenda" cor={cores.textoSecundario}>
            {item.detalhe}
          </Texto>
        ) : null}
        {item.feito && (
          <Texto variante="legenda" cor={cores.sucesso}>
            ✓ {remedio ? 'Dado' : 'Feito'}
            {item.feitoPor ? ` por ${item.feitoPor}` : ''}
            {item.feitoEm ? ` às ${hora(item.feitoEm)}` : ''}
          </Texto>
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
          <ActivityIndicator color={item.feito ? cores.branco : cores.secundaria} />
        ) : (
          <Texto style={[estilos.marcarTexto, item.feito && { color: cores.branco }]}>
            {item.feito ? '✓' : remedio ? 'Dei' : 'Feito'}
          </Texto>
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
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando o dia" />
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

  return (
    <View style={estilos.raiz}>
      <Tela
        titulo={saudacao()}
        subtitulo={pendentes === 0 ? 'Tudo feito por hoje. 🎉' : `${pendentes} ${pendentes === 1 ? 'coisa' : 'coisas'} para hoje.`}
      >
        {hoje.pets.length > 1 && (
          <View style={estilos.pets} accessibilityRole="radiogroup" accessibilityLabel="Pet">
            {[{ id: '', nome: 'Todos', especie: '' } as Pick<PetDoDia, 'id' | 'nome' | 'especie'>, ...hoje.pets].map((p) => {
              const ativo = petId === p.id;
              return (
                <Pressable
                  key={p.id || 'todos'}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: ativo }}
                  onPress={() => setPetId(p.id)}
                  style={[estilos.chip, ativo && estilos.chipAtivo]}
                >
                  <Texto style={[estilos.chipTexto, ativo && { color: cores.branco }]}>
                    {p.especie ? `${icone(p.especie)} ` : ''}
                    {p.nome}
                  </Texto>
                </Pressable>
              );
            })}
          </View>
        )}

        {selecionados.map((p) => (
          <Cartao key={p.id} titulo={`${icone(p.especie)} ${p.nome}`}>
            {p.itens.length === 0 ? (
              <View style={estilos.vazio}>
                <Texto cor={cores.textoSecundario}>Nada marcado para hoje.</Texto>
                <Botao
                  titulo="Criar uma rotina"
                  variante="texto"
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

        <AvaliarAtendimentos versao={versao} />

        {agendamentos.length > 0 && (
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
                  <Texto variante="legenda" cor={cores.sucesso}>
                    ✓ Confirmado
                  </Texto>
                ) : (
                  <Botao titulo="Confirmar" variante="secundaria" onPress={() => void confirmar(a.id)} />
                )}
              </View>
            ))}
          </Cartao>
        )}

        {vacinas.length > 0 && (
          <Cartao titulo="Vacinas">
            {vacinas.map((v) => (
              <Pressable
                key={`${v.petId}-${v.vacina}`}
                accessibilityRole="link"
                onPress={() => router.push({ pathname: '/pets/[petId]/vacinas', params: { petId: v.petId } })}
                style={estilos.vacina}
              >
                <Texto>
                  💉 {v.vacina} · {nomePet(v.petId)}
                </Texto>
                <Texto variante="legenda" cor={v.atrasada ? cores.erro : cores.alerta}>
                  {v.atrasada ? `Atrasada desde ${dataCurta(v.proximaDose)}` : `Vence em ${dataCurta(v.proximaDose)}`}
                </Texto>
              </Pressable>
            ))}
          </Cartao>
        )}

        {vacinas.some((v) => v.atrasada) && (
          <Alerta
            tipo="alerta"
            titulo="Tem vacina atrasada"
            mensagem="Agende pela aba Serviços. A clínica registra a vacina e ela chega aqui com o selo."
          />
        )}
        <View style={{ height: 72 }} />
      </Tela>

      {mais && (
        <Pressable style={estilos.fundoMenu} accessibilityLabel="Fechar atalhos" onPress={() => setMais(false)}>
          <View style={estilos.menu}>
            <Texto variante="legenda" cor={cores.textoSecundario}>
              Registrar para {nomePet(petDoAtalho)}
            </Texto>
            {ATALHOS.map((a) => (
              <Pressable
                key={a.destino}
                accessibilityRole="button"
                style={({ pressed }) => [estilos.menuItem, pressed && { backgroundColor: cores.superficie }]}
                onPress={() => {
                  setMais(false);
                  router.push({ pathname: `/pets/[petId]/${a.destino}`, params: { petId: petDoAtalho } });
                }}
              >
                <Texto>
                  {a.icone} {a.rotulo}
                </Texto>
              </Pressable>
            ))}
          </View>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar algo"
        onPress={() => setMais((m) => !m)}
        style={({ pressed }) => [estilos.mais, pressed && { backgroundColor: cores.primariaEscura }]}
      >
        <Texto style={estilos.maisTexto}>{mais ? '×' : '+'}</Texto>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  pets: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  chip: {
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  chipAtivo: { backgroundColor: cores.secundaria, borderColor: cores.secundaria },
  chipTexto: { fontWeight: '600' },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.md,
    paddingVertical: espaco.sm,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
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
    borderTopColor: cores.borda,
  },
  vacina: { paddingVertical: espaco.sm, borderTopWidth: 1, borderTopColor: cores.borda, gap: 2 },
  mais: {
    position: 'absolute',
    right: espaco.xl,
    bottom: espaco.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  maisTexto: { color: cores.branco, fontSize: 30, lineHeight: 34, fontWeight: '600' },
  fundoMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 27, 24, 0.25)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: espaco.xl,
    paddingBottom: 96,
  },
  menu: {
    minWidth: 220,
    padding: espaco.md,
    gap: espaco.xs,
    borderRadius: 16,
    backgroundColor: cores.fundo,
  },
  menuItem: { paddingVertical: espaco.md, paddingHorizontal: espaco.sm, borderRadius: 8 },
});

