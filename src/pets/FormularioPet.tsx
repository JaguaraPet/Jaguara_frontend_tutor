import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { api } from '../api/cliente';
import { Filtro } from '../catalogo/Filtro';
import { Alerta, Botao, Campo, Texto } from '../componentes';
import { hojeBrasilia } from './datas';
import { mascararData, paraEntrada, validar } from './formulario';
import type { ErrosPet, Especie, PetEntrada, ValoresPet } from './formulario';
import { cores, espaco } from '../tema/tokens';

interface Props {
  inicial: ValoresPet;
  tituloBotao: string;
  /** Envia o pet; devolve a mensagem de erro da API, ou null quando deu certo. */
  aoSalvar: (pet: PetEntrada) => Promise<string | null>;
}

/** Formulário de cadastro e edição do pet (UC-04), com espécie e raça do catálogo (RN07). */
export function FormularioPet({ inicial, tituloBotao, aoSalvar }: Props) {
  const [valores, setValores] = useState(inicial);
  const [especies, setEspecies] = useState<Especie[] | null>(null);
  const [erros, setErros] = useState<ErrosPet>({});
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

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

  async function salvar() {
    const encontrados = validar(valores, hojeBrasilia());
    setErros(encontrados);
    setErroApi(null);
    if (Object.keys(encontrados).length > 0) return;
    setSalvando(true);
    const erro = await aoSalvar(paraEntrada(valores));
    setSalvando(false);
    if (erro) setErroApi(erro);
  }

  if (especies === null) {
    return <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando espécies" />;
  }

  return (
    <View style={estilos.formulario}>
      {erroApi && <Alerta tipo="erro" titulo="Não foi possível salvar" mensagem={erroApi} />}
      <Campo rotulo="Nome" value={valores.nome} onChangeText={(t) => mudar('nome', t)} erro={erros.nome} />

      <Grupo rotulo="Espécie" erro={erros.especieId}>
        {especies.map((e) => (
          <Filtro
            key={e.id}
            rotulo={e.nome ?? ''}
            ativo={valores.especieId === e.id}
            aoTocar={() => setValores((v) => ({ ...v, especieId: e.id ?? '', racaId: '' }))}
          />
        ))}
      </Grupo>

      {especie && (
        <Grupo rotulo="Raça" erro={erros.racaId}>
          {(especie.racas ?? []).map((r) => (
            <Filtro
              key={r.id}
              rotulo={r.nome ?? ''}
              ativo={valores.racaId === r.id}
              aoTocar={() => mudar('racaId', r.id ?? '')}
            />
          ))}
        </Grupo>
      )}

      <Grupo rotulo="Sexo" erro={erros.sexo}>
        <Filtro rotulo="Macho" ativo={valores.sexo === 'MACHO'} aoTocar={() => mudar('sexo', 'MACHO')} />
        <Filtro rotulo="Fêmea" ativo={valores.sexo === 'FEMEA'} aoTocar={() => mudar('sexo', 'FEMEA')} />
      </Grupo>

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
      <Botao titulo={tituloBotao} larguraTotal carregando={salvando} onPress={() => void salvar()} />
    </View>
  );
}

function Grupo({ rotulo, erro, children }: { rotulo: string; erro?: string; children: React.ReactNode }) {
  return (
    <View style={estilos.grupo}>
      <Texto variante="legenda" negrito>
        {rotulo}
      </Texto>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.opcoes}>
        {children}
      </ScrollView>
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
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
