import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Cartao, Tela, Texto } from '../../../componentes';
import { DesarquivarPet } from '../../../pets/ArquivarPet';
import { FotoPet } from '../../../pets/FotoPet';
import { GRAVIDADE, SEXO, TIPO_ALERGIA, dataCurta, proximaDose, textoIdade } from '../../../pets/perfil';
import { cores, coresSuaves, espaco, raio } from '../../../tema/tokens';

type Pet = components['schemas']['Pet'];
type Alergia = components['schemas']['Alergia'];
type Vacina = components['schemas']['Vacinacao'];

const hojeIso = () => new Date().toISOString().slice(0, 10);

/** Perfil do pet (UC-04): dados, alergias graves em destaque (UC-37) e vacinas (UC-12). */
/** Seções do pet numa grade de atalhos, no lugar de uma lista de botões. */
const SECOES = [
  { titulo: 'Rotinas', caminho: 'rotinas', icone: '🔁' },
  { titulo: 'Vacinas', caminho: 'vacinas', icone: '💉' },
  { titulo: 'Medicamentos', caminho: 'medicamentos', icone: '💊' },
  { titulo: 'Exames', caminho: 'exames', icone: '🧪' },
  { titulo: 'Alergias e restrições', caminho: 'alergias', icone: '⚠️' },
  { titulo: 'Alimentação', caminho: 'alimentacao', icone: '🥣' },
  { titulo: 'Linha do tempo', caminho: 'linha-do-tempo', icone: '🕒' },
  { titulo: 'Documentos', caminho: 'documentos', icone: '📄' },
  { titulo: 'Despesas', caminho: 'despesas', icone: '🧾' },
  { titulo: 'Responsáveis', caminho: 'responsaveis', icone: '👨‍👩‍👧' },
  { titulo: 'Compartilhar perfil', caminho: 'compartilhar', icone: '🔗' },
] as const;

export default function PerfilPet() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [alergias, setAlergias] = useState<Alergia[]>([]);
  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [erro, setErro] = useState(false);
  const [hoje] = useState(hojeIso);
  const [versao, setVersao] = useState(0);
  const [erroFoto, setErroFoto] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const caminho = { params: { path: { petId } } };
    void Promise.all([
      api.GET('/pets/{petId}', caminho),
      api.GET('/pets/{petId}/alergias', caminho),
      api.GET('/pets/{petId}/vacinacoes', caminho),
    ]).then(([p, a, v]) => {
      if (!ativo) return;
      if (!p.data) {
        setErro(true);
        return;
      }
      setPet(p.data);
      setAlergias(a.data ?? []);
      setVacinas(v.data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [petId, versao]);

  if (erro) {
    return (
      <Tela titulo="Pet">
        <Alerta tipo="erro" titulo="Pet indisponível" mensagem="Não encontramos este pet ou você não tem acesso a ele." />
        <Botao titulo="Voltar" variante="secundaria" onPress={() => router.back()} />
      </Tela>
    );
  }
  if (!pet) {
    return (
      <Tela titulo="Pet">
        <ActivityIndicator color={cores.primaria} accessibilityLabel="Carregando o pet" />
      </Tela>
    );
  }

  const graves = alergias.filter((a) => a.destaque);
  const proxima = proximaDose(vacinas, hoje);
  const dados: [string, string | undefined][] = [
    ['Espécie', pet.especie],
    ['Raça', pet.raca],
    ['Sexo', SEXO[pet.sexo]],
    ['Idade', textoIdade(pet.idade)],
    ['Nascimento', dataCurta(pet.dataNascimento)],
    ['Peso', pet.pesoKg ? `${String(pet.pesoKg).replace('.', ',')} kg` : undefined],
    ['Cor', pet.cor],
    ['Castrado', pet.castrado ? 'Sim' : 'Não'],
    ['Microchip', pet.microchip],
  ];

  return (
    <Tela titulo={pet.nome} subtitulo={[pet.especie, pet.raca].filter(Boolean).join(' · ')}>
      <FotoPet
        petId={pet.id!}
        nome={pet.nome}
        especie={pet.especie}
        fotoUrl={pet.fotoUrl}
        tamanho={112}
        aoTrocar={(e) => {
          setErroFoto(e);
          if (!e) setVersao((n) => n + 1);
        }}
      />
      {erroFoto && <Alerta tipo="erro" titulo="Foto não enviada" mensagem={erroFoto} />}
      {pet.status !== 'ATIVO' && (
        <Alerta
          tipo="info"
          titulo={pet.status === 'FALECIDO' ? 'Em memória' : 'Pet arquivado'}
          mensagem="O histórico continua disponível para consulta."
        />
      )}
      {pet.status === 'ARQUIVADO' && (
        <DesarquivarPet petId={petId} nome={pet.nome} aoDesarquivar={() => setPet({ ...pet, status: 'ATIVO' })} />
      )}

      {graves.map((a) => (
        <View key={a.id} style={estilos.destaque} accessible accessibilityRole="alert">
          <Texto negrito cor={cores.erro}>
            Atenção: {TIPO_ALERGIA[a.tipo].toLowerCase()} grave
          </Texto>
          <Texto>{a.descricao}</Texto>
        </View>
      ))}

      <View style={estilos.grade}>
        {SECOES.map((secao) => (
          <Pressable
            key={secao.caminho}
            accessibilityRole="button"
            accessibilityLabel={secao.titulo}
            onPress={() => router.push(`/pets/${pet.id}/${secao.caminho}`)}
            style={({ pressed }) => [estilos.secao, pressed && { backgroundColor: cores.superficie }]}
          >
            <Texto style={estilos.secaoIcone}>{secao.icone}</Texto>
            <Texto style={estilos.secaoTitulo}>{secao.titulo}</Texto>
          </Pressable>
        ))}
      </View>

      <Cartao titulo="Dados">
        {dados
          .filter(([, valor]) => valor)
          .map(([rotulo, valor]) => (
            <View key={rotulo} style={estilos.linha}>
              <Texto variante="legenda" cor={cores.textoSecundario}>
                {rotulo}
              </Texto>
              <Texto>{valor}</Texto>
            </View>
          ))}
      </Cartao>

      <Cartao titulo="Alergias e restrições">
        {alergias.length === 0 ? (
          <Texto cor={cores.textoSecundario}>Nenhuma registrada.</Texto>
        ) : (
          alergias.map((a) => (
            <Texto key={a.id}>
              {TIPO_ALERGIA[a.tipo]}: {a.descricao} ({GRAVIDADE[a.gravidade]})
            </Texto>
          ))
        )}
      </Cartao>

      <Cartao titulo="Vacinas">
        {proxima && (
          <Texto negrito>
            Próxima dose: {proxima.nomeVacina} em {dataCurta(proxima.data)}
          </Texto>
        )}
        {vacinas.length === 0 ? (
          <Texto cor={cores.textoSecundario}>Nenhuma vacina registrada.</Texto>
        ) : (
          vacinas
            .slice(-3)
            .reverse()
            .map((v) => (
              <Texto key={v.id}>
                {v.nomeVacina} · {dataCurta(v.dataAplicacao)}
              </Texto>
            ))
        )}
      </Cartao>

      {pet.status === 'ATIVO' && (
        <Botao titulo="Editar dados" larguraTotal onPress={() => router.push(`/pets/${pet.id}/editar`)} />
      )}
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm, alignSelf: 'stretch' },
  secao: {
    width: '47%',
    minWidth: 140,
    flexGrow: 1,
    minHeight: 84,
    padding: espaco.md,
    gap: espaco.xs,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
    justifyContent: 'center',
  },
  secaoIcone: { fontSize: 22 },
  secaoTitulo: { fontWeight: '600', fontSize: 14, lineHeight: 18 },
  destaque: {
    backgroundColor: coresSuaves.erro,
    borderLeftWidth: 4,
    borderLeftColor: cores.erro,
    borderRadius: raio.padrao,
    padding: espaco.md,
    gap: espaco.xs,
    alignSelf: 'stretch',
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espaco.md,
  },
});
