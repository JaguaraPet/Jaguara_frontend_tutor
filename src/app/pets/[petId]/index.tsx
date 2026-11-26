import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../../api/cliente';
import type { components } from '../../../api/esquema';
import { Alerta, Botao, Cartao, Tela, Texto } from '../../../componentes';
import { DesarquivarPet } from '../../../pets/ArquivarPet';
import { GRAVIDADE, SEXO, TIPO_ALERGIA, dataCurta, proximaDose, textoIdade } from '../../../pets/perfil';
import { cores, coresSuaves, espaco, raio } from '../../../tema/tokens';

type Pet = components['schemas']['Pet'];
type Alergia = components['schemas']['Alergia'];
type Vacina = components['schemas']['Vacinacao'];

const hojeIso = () => new Date().toISOString().slice(0, 10);

/** Perfil do pet (UC-04): dados, alergias graves em destaque (UC-37) e vacinas (UC-12). */
export default function PerfilPet() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [alergias, setAlergias] = useState<Alergia[]>([]);
  const [vacinas, setVacinas] = useState<Vacina[]>([]);
  const [erro, setErro] = useState(false);
  const [hoje] = useState(hojeIso);

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
  }, [petId]);

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
      <Botao titulo="Linha do tempo" variante="secundaria" larguraTotal onPress={() => router.push(`/pets/${pet.id}/linha-do-tempo`)} />
      <Botao titulo="Vacinas" variante="secundaria" larguraTotal onPress={() => router.push(`/pets/${pet.id}/vacinas`)} />
      <Botao titulo="Medicamentos" variante="secundaria" larguraTotal onPress={() => router.push(`/pets/${pet.id}/medicamentos`)} />
      <Botao titulo="Exames" variante="secundaria" larguraTotal onPress={() => router.push(`/pets/${pet.id}/exames`)} />
      <Botao titulo="Documentos" variante="secundaria" larguraTotal onPress={() => router.push(`/pets/${pet.id}/documentos`)} />
      <Botao titulo="Alimentação" variante="secundaria" larguraTotal onPress={() => router.push(`/pets/${pet.id}/alimentacao`)} />
      <Botao titulo="Despesas" variante="secundaria" larguraTotal onPress={() => router.push(`/pets/${pet.id}/despesas`)} />
      <Botao titulo="Responsáveis" variante="secundaria" larguraTotal onPress={() => router.push(`/pets/${pet.id}/responsaveis`)} />
      <Botao titulo="Memorial" variante="texto" larguraTotal onPress={() => router.push(`/pets/${pet.id}/memorial`)} />
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
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
