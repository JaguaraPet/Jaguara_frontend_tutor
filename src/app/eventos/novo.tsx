import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TIPOS_EVENTO, mascararHora, montarEvento } from '../../agenda/agenda';
import type { TipoEvento, ValoresEvento } from '../../agenda/agenda';
import { api } from '../../api/cliente';
import { Alerta, Botao, Campo, Opcoes, Tela, Texto } from '../../componentes';
import { mensagemDaApi } from '../../pets/erros';
import { mascararData } from '../../pets/formulario';

/** Novo evento no calendário do pet (UC-10, RN14, RN37). */
export default function NovoEvento() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const [v, setV] = useState<ValoresEvento>({
    titulo: '',
    tipo: 'CONSULTA',
    data: '',
    inicio: '',
    fim: '',
    local: '',
    descricao: '',
  });
  const [erros, setErros] = useState<Partial<Record<keyof ValoresEvento, string>>>({});
  const [erroApi, setErroApi] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const mudar = (campo: keyof ValoresEvento) => (valor: string) => setV((a) => ({ ...a, [campo]: valor }));

  async function salvar() {
    const montado = montarEvento(v);
    if (!montado.ok) {
      setErros(montado.erros);
      return;
    }
    setErros({});
    setErroApi(null);
    setSalvando(true);
    const { error } = await api.POST('/pets/{petId}/eventos', { params: { path: { petId } }, body: montado.corpo });
    setSalvando(false);
    if (error) {
      setErroApi(mensagemDaApi(error));
      return;
    }
    router.back();
  }

  return (
    <Tela titulo="Novo evento" subtitulo="Você recebe um lembrete uma hora antes.">
      {erroApi && <Alerta tipo="erro" titulo="Evento não criado" mensagem={erroApi} />}
      <Campo rotulo="Título" value={v.titulo} onChangeText={mudar('titulo')} erro={erros.titulo} />
      <Texto variante="legenda" negrito>
        Tipo
      </Texto>
      <Opcoes<TipoEvento> rotulo="Tipo" opcoes={TIPOS_EVENTO} valor={v.tipo} aoMudar={(t) => setV((a) => ({ ...a, tipo: t }))} />
      <Campo
        rotulo="Data (DD/MM/AAAA)"
        keyboardType="number-pad"
        value={v.data}
        onChangeText={(t) => mudar('data')(mascararData(t))}
        erro={erros.data}
      />
      <Campo
        rotulo="Início (HH:MM)"
        keyboardType="number-pad"
        value={v.inicio}
        onChangeText={(t) => mudar('inicio')(mascararHora(t))}
        erro={erros.inicio}
      />
      <Campo
        rotulo="Fim (opcional)"
        keyboardType="number-pad"
        ajuda="Sem fim, o evento ocupa uma hora."
        value={v.fim}
        onChangeText={(t) => mudar('fim')(mascararHora(t))}
        erro={erros.fim}
      />
      <Campo rotulo="Local (opcional)" value={v.local} onChangeText={mudar('local')} />
      <Campo rotulo="Observações (opcional)" value={v.descricao} onChangeText={mudar('descricao')} multiline />
      <Botao titulo="Salvar evento" larguraTotal carregando={salvando} onPress={() => void salvar()} />
      <Botao titulo="Cancelar" variante="texto" onPress={() => router.back()} />
    </Tela>
  );
}
