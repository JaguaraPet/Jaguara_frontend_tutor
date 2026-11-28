import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { api } from '../api/cliente';
import { Filtro } from '../catalogo/Filtro';
import { Alerta, Botao, Campo, Texto } from '../componentes';
import { hojeBrasilia } from './datas';
import { filtrarRacas, mascararData, ordenarEspecies, paraEntrada, RACA_OUTRA, validar } from './formulario';
import type { ErrosPet, Especie, PetEntrada, ValoresPet } from './formulario';
import { alvoToqueMinimo, cores, espaco, raio } from '../tema/tokens';

interface Props {
  inicial: ValoresPet;
  tituloBotao: string;
  /** Na edição a espécie fica travada: só a raça pode ser corrigida. */
  edicao?: boolean;
  /** Envia o pet; devolve a mensagem de erro da API, ou null quando deu certo. */
  aoSalvar: (pet: PetEntrada) => Promise<string | null>;
}

/** O cadastro em três etapas curtas; a edição continua numa tela só. */
const ETAPAS: { titulo: string; campos: (keyof ValoresPet)[] }[] = [
  { titulo: 'Quem é o pet', campos: ['nome', 'especieId'] },
  { titulo: 'Raça e sexo', campos: ['racaId', 'racaDescricao', 'sexo'] },
  { titulo: 'Detalhes, se quiser', campos: ['nascimento', 'peso'] },
];

/** Formulário de cadastro e edição do pet (UC-04), com espécie e raça do catálogo (RN07). */
export function FormularioPet({ inicial, tituloBotao, edicao = false, aoSalvar }: Props) {
  const [valores, setValores] = useState(inicial);
  const [busca, setBusca] = useState('');
  const [especies, setEspecies] = useState<Especie[] | null>(null);
  const [erros, setErros] = useState<ErrosPet>({});
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [etapa, setEtapa] = useState(0);

  useEffect(() => {
    let ativo = true;
    api
      .GET('/especies')
      .then(({ data }) => ativo && setEspecies(data ?? []))
      .catch(() => ativo && setEspecies([]));
    return () => {
      ativo = false;
    };
  }, []);

  const mudar = <K extends keyof ValoresPet>(campo: K, valor: ValoresPet[K]) =>
    setValores((v) => ({ ...v, [campo]: valor }));

  const especie = especies?.find((e) => e.id === valores.especieId);
  const racaOutra = especie?.racas?.find((r) => r.id === valores.racaId)?.nome === RACA_OUTRA;
  const racas = filtrarRacas(especie?.racas ?? [], busca);
  // Sem busca, mostra as primeiras e a escolhida; a busca alcança todas.
  const visiveis = busca.trim()
    ? racas
    : racas.filter((r, i) => i < 12 || r.id === valores.racaId || r.nome === RACA_OUTRA);

  async function salvar() {
    const encontrados = validar(valores, hojeBrasilia(), racaOutra);
    setErros(encontrados);
    setErroApi(null);
    if (Object.keys(encontrados).length > 0) return;
    setSalvando(true);
    const erro = await aoSalvar(paraEntrada(valores, racaOutra));
    setSalvando(false);
    if (erro) setErroApi(erro);
  }

  /** Confere só os campos da etapa atual; sem erro, segue (ou salva, na última). */
  function continuar() {
    const todos = validar(valores, hojeBrasilia(), racaOutra);
    const daEtapa = Object.fromEntries(
      Object.entries(todos).filter(([campo]) => ETAPAS[etapa].campos.includes(campo as keyof ValoresPet)),
    ) as ErrosPet;
    setErros(daEtapa);
    if (Object.keys(daEtapa).length > 0) return;
    if (etapa < ETAPAS.length - 1) setEtapa(etapa + 1);
    else void salvar();
  }

  if (especies === null) {
    return <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando espécies" />;
  }

  const escolherEspecie = (id: string) => {
    if (edicao) return;
    setBusca('');
    setValores((v) => ({ ...v, especieId: id, racaId: v.especieId === id ? v.racaId : '', racaDescricao: '' }));
  };

  const camposRaca = especie && (
    <>
      {(especie.racas?.length ?? 0) > 13 && (
        <Campo rotulo="Buscar raça" placeholder="Digite parte do nome" value={busca} onChangeText={setBusca} />
      )}
      <Grupo rotulo="Raça" erro={erros.racaId} quebrar={!edicao}>
        {visiveis.map((r) => (
          <Filtro
            key={r.id}
            rotulo={r.nome ?? ''}
            ativo={valores.racaId === r.id}
            aoTocar={() => mudar('racaId', r.id ?? '')}
          />
        ))}
        {!busca.trim() && racas.length > visiveis.length && (
          <Texto variante="legenda" cor={cores.textoSecundario}>
            Mais {racas.length - visiveis.length} raças: use a busca.
          </Texto>
        )}
      </Grupo>
      {racaOutra && (
        <Campo
          rotulo="Qual é a raça?"
          value={valores.racaDescricao}
          onChangeText={(t) => mudar('racaDescricao', t)}
          maxLength={80}
          erro={erros.racaDescricao}
        />
      )}
    </>
  );

  const campoSexo = (
    <Grupo rotulo="Sexo" erro={erros.sexo} quebrar={!edicao}>
      <Filtro rotulo="Macho" ativo={valores.sexo === 'MACHO'} aoTocar={() => mudar('sexo', 'MACHO')} />
      <Filtro rotulo="Fêmea" ativo={valores.sexo === 'FEMEA'} aoTocar={() => mudar('sexo', 'FEMEA')} />
    </Grupo>
  );

  const detalhes = (
    <>
      <Campo
        rotulo="Data de nascimento (opcional)"
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        value={valores.nascimento}
        onChangeText={(t) => mudar('nascimento', mascararData(t))}
        erro={erros.nascimento}
      />
      <Campo
        rotulo="Peso em kg (opcional)"
        placeholder="12,5"
        keyboardType="decimal-pad"
        value={valores.peso}
        onChangeText={(t) => mudar('peso', t)}
        erro={erros.peso}
      />
      <Campo rotulo="Cor (opcional)" value={valores.cor} onChangeText={(t) => mudar('cor', t)} />
      <Campo
        rotulo="Microchip (opcional)"
        value={valores.microchip}
        onChangeText={(t) => mudar('microchip', t)}
        autoCapitalize="characters"
      />
      <View style={estilos.linha}>
        <Texto>Castrado</Texto>
        <Switch
          accessibilityLabel="Castrado"
          value={valores.castrado}
          onValueChange={(v) => mudar('castrado', v)}
          trackColor={{ true: cores.primaria, false: cores.borda }}
        />
      </View>
    </>
  );

  if (edicao) {
    return (
      <View style={estilos.formulario}>
        {erroApi && <Alerta tipo="erro" titulo="Não foi possível salvar" mensagem={erroApi} />}
        <Campo rotulo="Nome" value={valores.nome} onChangeText={(t) => mudar('nome', t)} erro={erros.nome} />
        <Grupo rotulo="Espécie" erro={erros.especieId}>
          <Texto variante="legenda" cor={cores.textoSecundario}>
            A espécie não muda depois do cadastro.
          </Texto>
          {especie && <Filtro rotulo={especie.nome ?? ''} ativo aoTocar={() => undefined} />}
        </Grupo>
        {camposRaca}
        {campoSexo}
        {detalhes}
        <Botao titulo={tituloBotao} larguraTotal carregando={salvando} onPress={() => void salvar()} />
      </View>
    );
  }

  const ultima = etapa === ETAPAS.length - 1;
  return (
    <View style={estilos.formulario}>
      <View style={estilos.progresso} accessibilityRole="progressbar" accessibilityLabel={`Etapa ${etapa + 1} de ${ETAPAS.length}`}>
        <View style={estilos.barras}>
          {ETAPAS.map((e, i) => (
            <View key={e.titulo} style={[estilos.barra, i <= etapa && estilos.barraFeita]} />
          ))}
        </View>
        <Texto variante="legenda" cor={cores.textoSecundario}>
          Etapa {etapa + 1} de {ETAPAS.length}
        </Texto>
        <Texto variante="titulo2" accessibilityRole="header">
          {ETAPAS[etapa].titulo}
        </Texto>
      </View>
      {erroApi && <Alerta tipo="erro" titulo="Não foi possível salvar" mensagem={erroApi} />}

      {etapa === 0 && (
        <>
          <Campo rotulo="Nome" value={valores.nome} onChangeText={(t) => mudar('nome', t)} erro={erros.nome} />
          <View style={estilos.grupo}>
            <Texto variante="legenda" negrito>
              Qual é o bicho?
            </Texto>
            <View style={estilos.grade} accessibilityRole="radiogroup" accessibilityLabel="Espécie">
              {ordenarEspecies(especies).map((e) => {
                const ativo = valores.especieId === e.id;
                return (
                  <Pressable
                    key={e.id}
                    accessibilityRole="radio"
                    accessibilityLabel={e.nome ?? ''}
                    accessibilityState={{ checked: ativo }}
                    onPress={() => escolherEspecie(e.id ?? '')}
                    style={({ pressed }) => [estilos.opcao, ativo && estilos.opcaoAtiva, pressed && !ativo && estilos.opcaoPressionada]}
                  >
                    <Texto negrito={ativo} cor={ativo ? cores.branco : cores.texto} style={estilos.opcaoTexto}>
                      {e.nome}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
            {erros.especieId && (
              <Texto variante="legenda" cor={cores.erro} accessibilityRole="alert">
                {erros.especieId}
              </Texto>
            )}
          </View>
        </>
      )}

      {etapa === 1 && (
        <>
          {camposRaca}
          {campoSexo}
        </>
      )}

      {etapa === 2 && detalhes}

      <View style={estilos.acoes}>
        {etapa > 0 && (
          <View style={estilos.acao}>
            <Botao
              titulo="Voltar"
              variante="secundaria"
              larguraTotal
              onPress={() => {
                setErros({});
                setEtapa(etapa - 1);
              }}
            />
          </View>
        )}
        <View style={estilos.acao}>
          <Botao titulo={ultima ? tituloBotao : 'Continuar'} larguraTotal carregando={salvando} onPress={continuar} />
        </View>
      </View>
    </View>
  );
}

function Grupo({
  rotulo,
  erro,
  quebrar = false,
  children,
}: {
  rotulo: string;
  erro?: string;
  /** Quebra as opções em linhas em vez de rolar para o lado. */
  quebrar?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={estilos.grupo}>
      <Texto variante="legenda" negrito>
        {rotulo}
      </Texto>
      {quebrar ? (
        <View style={[estilos.opcoes, estilos.quebra]}>{children}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.opcoes}>
          {children}
        </ScrollView>
      )}
      {erro && (
        <Texto variante="legenda" cor={cores.erro} accessibilityRole="alert">
          {erro}
        </Texto>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  formulario: { gap: espaco.lg },
  grupo: { gap: espaco.sm },
  opcoes: { gap: espaco.sm },
  quebra: { flexDirection: 'row', flexWrap: 'wrap' },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progresso: { gap: espaco.xs },
  barras: { flexDirection: 'row', gap: espaco.xs, marginBottom: espaco.xs },
  barra: { flex: 1, height: 4, borderRadius: 2, backgroundColor: cores.borda },
  barraFeita: { backgroundColor: cores.secundaria },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: alvoToqueMinimo + 4,
    justifyContent: 'center',
    paddingHorizontal: espaco.md,
    borderRadius: raio.padrao,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  opcaoAtiva: { backgroundColor: cores.secundaria, borderColor: cores.secundaria },
  opcaoPressionada: { backgroundColor: cores.superficie },
  opcaoTexto: { textAlign: 'center' },
  acoes: { flexDirection: 'row', gap: espaco.sm },
  acao: { flex: 1 },
});
