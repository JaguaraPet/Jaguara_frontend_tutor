import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { api } from '../../../api/cliente';
import { Alerta, Botao, Tela } from '../../../componentes';
import { ArquivarPet } from '../../../pets/ArquivarPet';
import { mensagemDaApi } from '../../../pets/erros';
import { FormularioPet } from '../../../pets/FormularioPet';
import { dataBr } from '../../../pets/formulario';
import type { ValoresPet } from '../../../pets/formulario';
import { cores } from '../../../tema/tokens';

/** Edição do pet (UC-04) pelos responsáveis. */
export default function EditarPet() {
  const { petId, novo } = useLocalSearchParams<{ petId: string; novo?: string }>();
  const [inicial, setInicial] = useState<ValoresPet | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const [pet, especies] = await Promise.all([
        api.GET('/pets/{petId}', { params: { path: { petId } } }),
        api.GET('/especies'),
      ]);
      if (!ativo) return;
      if (!pet.data) {
        setErro('Não encontramos este pet.');
        return;
      }
      const p = pet.data;
      const especie = (especies.data ?? []).find((e) => e.racas?.some((r) => r.id === p.racaId));
      setInicial({
        nome: p.nome,
        especieId: especie?.id ?? '',
        racaId: p.racaId,
        racaDescricao: p.racaDescricao ?? '',
        sexo: p.sexo,
        nascimento: dataBr(p.dataNascimento),
        peso: p.pesoKg ? String(p.pesoKg).replace('.', ',') : '',
        cor: p.cor ?? '',
        microchip: p.microchip ?? '',
        castrado: p.castrado,
      });
    })();
    return () => {
      ativo = false;
    };
  }, [petId]);

  if (erro) {
    return (
      <Tela titulo="Editar pet">
        <Alerta tipo="erro" titulo="Pet indisponível" mensagem={erro} />
        <Botao titulo="Voltar" variante="secundaria" onPress={() => router.back()} />
      </Tela>
    );
  }
  if (!inicial) {
    return (
      <Tela titulo="Editar pet">
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando o pet" />
      </Tela>
    );
  }
  return (
    <Tela titulo={`Editar ${inicial.nome}`}>
      {novo && !salvo && (
        <Alerta tipo="sucesso" titulo="Pet cadastrado" mensagem="Você pode completar os dados quando quiser." />
      )}
      {salvo && <Alerta tipo="sucesso" titulo="Alterações salvas" />}
      <FormularioPet
        edicao
        inicial={inicial}
        tituloBotao="Salvar alterações"
        aoSalvar={async (pet) => {
          const { error } = await api.PATCH('/pets/{petId}', { params: { path: { petId } }, body: pet });
          if (error) return mensagemDaApi(error);
          setSalvo(true);
          return null;
        }}
      />
      {!novo && <ArquivarPet petId={petId} nome={inicial.nome} />}
      <Botao titulo="Ver perfil do pet" variante="secundaria" onPress={() => router.replace(`/pets/${petId}`)} />
      <Botao titulo="Voltar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}
