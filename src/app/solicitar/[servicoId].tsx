import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { horaBrasilia, proximosDias, rotuloDia } from '../../agendamento/solicitar';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Tela, Texto } from '../../componentes';
import { hojeBrasilia } from '../../pets/datas';
import { mensagemDaApi } from '../../pets/erros';
import { alvoToqueMinimo, cores, espaco, raio } from '../../tema/tokens';
import { criarEstilos } from '../../tema/estilos';

type Pet = components['schemas']['Pet'];

/** Opção de escolha única (pet, dia ou horário), anunciada como botão de opção. */
function Opcao({ rotulo, escolhida, aoEscolher }: { rotulo: string; escolhida: boolean; aoEscolher: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: escolhida }}
      onPress={aoEscolher}
      style={[estilos.opcao, escolhida && estilos.escolhida]}
    >
      <Texto negrito={escolhida} cor={escolhida ? cores.sobrePrimaria : cores.texto}>
        {rotulo}
      </Texto>
    </Pressable>
  );
}

/** Solicitar agendamento de serviço (UC-40, RN14, RN38, RN40). */
export default function SolicitarAgendamento() {
  const { servicoId, servico, empresa, petId: petInicial } = useLocalSearchParams<{
    servicoId: string;
    servico?: string;
    empresa?: string;
    petId?: string;
  }>();
  const [dias] = useState(() => proximosDias(hojeBrasilia()));
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petId, setPetId] = useState(petInicial ?? '');
  const [dia, setDia] = useState('');
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [horario, setHorario] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    void api.GET('/pets').then(({ data }) => {
      const ativos = (data?.itens ?? []).filter((p) => p.status === 'ATIVO');
      setPets(ativos);
      if (ativos.length === 1) setPetId(ativos[0].id!);
    });
  }, []);

  useEffect(() => {
    if (!dia) return;
    let ativo = true;
    void api
      .GET('/servicos/{servicoId}/horarios-disponiveis', { params: { path: { servicoId }, query: { data: dia } } })
      .then(({ data }) => {
        if (ativo) setHorarios(data ?? []);
      });
    return () => {
      ativo = false;
    };
  }, [servicoId, dia, versao]);

  function escolherDia(d: string) {
    setDia(d);
    setHorarios(null);
    setHorario('');
  }

  async function enviar() {
    if (!petId || !horario) {
      setErro(!petId ? 'Escolha o pet.' : 'Escolha um horário livre.');
      return;
    }
    setErro(null);
    setEnviando(true);
    const { error, response } = await api.POST('/solicitacoes', {
      body: { servicoId, petId, dataHoraDesejada: horario, observacoes: observacoes.trim() || undefined },
    });
    setEnviando(false);
    if (error) {
      if (response.status === 409) {
        // CT-40-02: o horário foi ocupado; a lista é atualizada.
        setErro('Esse horário acabou de ser ocupado. Escolha outro entre os horários atualizados.');
        setHorario('');
        setHorarios(null);
        setVersao((v) => v + 1);
      } else {
        setErro(mensagemDaApi(error));
      }
      return;
    }
    setEnviada(true);
  }

  if (enviada) {
    return (
      <Tela titulo="Solicitação enviada">
        <Alerta
          tipo="sucesso"
          titulo="Pedido enviado à empresa"
          mensagem={`${servico ?? 'O serviço'} em ${rotuloDia(dia)} às ${horaBrasilia(horario)}. Você recebe um aviso quando a empresa responder.`}
        />
        <Botao titulo="Ver minhas solicitações" larguraTotal onPress={() => router.replace('/solicitacoes')} />
        <Botao titulo="Voltar para a empresa" variante="texto" onPress={() => router.back()} />
      </Tela>
    );
  }

  return (
    <Tela titulo={`Agendar ${servico ?? 'serviço'}`} subtitulo={empresa}>
      {erro && <Alerta tipo="erro" titulo="Solicitação não enviada" mensagem={erro} />}

      <Texto variante="titulo2">Pet</Texto>
      {pets === null ? (
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando os pets" />
      ) : pets.length === 0 ? (
        <Alerta tipo="info" titulo="Cadastre um pet primeiro" mensagem="A solicitação é sempre para um dos seus pets." />
      ) : (
        <View style={estilos.grupo} accessibilityRole="radiogroup" accessibilityLabel="Pet">
          {pets.map((p) => (
            <Opcao key={p.id} rotulo={p.nome} escolhida={p.id === petId} aoEscolher={() => setPetId(p.id!)} />
          ))}
        </View>
      )}

      <Texto variante="titulo2">Dia</Texto>
      <View style={estilos.grupo} accessibilityRole="radiogroup" accessibilityLabel="Dia">
        {dias.map((d) => (
          <Opcao key={d} rotulo={rotuloDia(d)} escolhida={d === dia} aoEscolher={() => escolherDia(d)} />
        ))}
      </View>

      {dia !== '' && (
        <>
          <Texto variante="titulo2">Horário</Texto>
          {horarios === null ? (
            <ActivityIndicator color={cores.destaque} accessibilityLabel="Buscando horários" />
          ) : horarios.length === 0 ? (
            <Texto cor={cores.textoSecundario}>Nenhum horário livre neste dia. Escolha outro dia.</Texto>
          ) : (
            <View style={estilos.grupo} accessibilityRole="radiogroup" accessibilityLabel="Horário">
              {horarios.map((h) => (
                <Opcao key={h} rotulo={horaBrasilia(h)} escolhida={h === horario} aoEscolher={() => setHorario(h)} />
              ))}
            </View>
          )}
        </>
      )}

      <Campo
        rotulo="Observações (opcional)"
        value={observacoes}
        onChangeText={setObservacoes}
        multiline
        maxLength={500}
      />
      <Botao titulo="Enviar solicitação" larguraTotal carregando={enviando} onPress={() => void enviar()} />
    </Tela>
  );
}

const estilos = criarEstilos(() => ({
  grupo: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.sm },
  opcao: {
    minHeight: alvoToqueMinimo,
    justifyContent: 'center',
    paddingHorizontal: espaco.md,
    borderWidth: 1,
    borderColor: cores.textoSecundario,
    borderRadius: raio.padrao,
    backgroundColor: cores.fundo,
  },
  escolhida: { backgroundColor: cores.primaria, borderColor: cores.primaria },
}));
