import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { TIPOS_EVENTO } from '../agenda/agenda';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Alerta, Cartao, Opcoes, Tela, Texto } from '../componentes';
import { mensagemDaApi } from '../pets/erros';
import { cores, espaco } from '../tema/tokens';

type Notificacao = components['schemas']['Notificacao'];
type Configuracao = components['schemas']['ConfiguracaoNotificacao'];
type Aba = 'AVISOS' | 'PREFERENCIAS';

/** Antecedências oferecidas, em minutos (RN37). */
const ANTECEDENCIAS: { valor: string; rotulo: string }[] = [
  { valor: '0', rotulo: 'Na hora' },
  { valor: '30', rotulo: '30 min antes' },
  { valor: '60', rotulo: '1 h antes' },
  { valor: '1440', rotulo: '1 dia antes' },
];

const rotuloTipo = (t?: string) => TIPOS_EVENTO.find((x) => x.valor === t)?.rotulo ?? t ?? '';
const quando = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '';

/** Notificações (UC-31): avisos recebidos e programados e a preferência de cada tipo (RN37). */
export default function Notificacoes() {
  const [aba, setAba] = useState<Aba>('AVISOS');
  const [avisos, setAvisos] = useState<Notificacao[] | null>(null);
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([]);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);

  useEffect(() => {
    void Promise.all([api.GET('/notificacoes'), api.GET('/notificacoes/configuracoes')]).then(([n, c]) => {
      setAvisos(n.data ?? []);
      setConfiguracoes(c.data ?? []);
    });
  }, []);

  async function salvar(c: Configuracao, mudanca: Partial<Configuracao>) {
    const nova = { ...c, ...mudanca };
    setConfiguracoes((lista) => lista.map((x) => (x.tipoEvento === c.tipoEvento ? nova : x)));
    const { error } = await api.PUT('/notificacoes/configuracoes/{tipoEvento}', {
      params: { path: { tipoEvento: c.tipoEvento! } },
      body: { canal: nova.canal === 'EMAIL' ? 'EMAIL' : 'PUSH', antecedenciaMinutos: nova.antecedenciaMinutos ?? 0, ativa: nova.ativa ?? true },
    });
    if (error) {
      setConfiguracoes((lista) => lista.map((x) => (x.tipoEvento === c.tipoEvento ? c : x)));
      setAviso({ tipo: 'erro', titulo: 'Preferência não salva', mensagem: mensagemDaApi(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: `${rotuloTipo(c.tipoEvento)}: preferência salva`, mensagem: 'Vale para os próximos lembretes.' });
  }

  const programados = (avisos ?? []).filter((n) => n.status === 'AGENDADA');
  const recebidos = (avisos ?? []).filter((n) => n.status === 'ENVIADA');

  return (
    <Tela titulo="Notificações">
      <Opcoes<Aba>
        rotulo="Ver"
        opcoes={[
          { valor: 'AVISOS', rotulo: 'Avisos' },
          { valor: 'PREFERENCIAS', rotulo: 'Preferências' },
        ]}
        valor={aba}
        aoMudar={setAba}
      />
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}

      {aba === 'AVISOS' &&
        (avisos === null ? (
          <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando as notificações" />
        ) : (
          <>
            <Texto variante="titulo2">Próximos lembretes</Texto>
            {programados.length === 0 ? (
              <Texto cor={cores.textoSecundario}>Nenhum lembrete programado.</Texto>
            ) : (
              programados.map((n) => (
                <Cartao key={n.id} titulo={n.titulo} subtitulo={quando(n.dataProgramada)}>
                  <Texto>{n.mensagem}</Texto>
                </Cartao>
              ))
            )}
            <Texto variante="titulo2">Recebidos</Texto>
            {recebidos.length === 0 ? (
              <Texto cor={cores.textoSecundario}>Nenhum aviso recebido ainda.</Texto>
            ) : (
              recebidos.map((n) => (
                <Cartao key={n.id} titulo={n.titulo} subtitulo={quando(n.dataEnvio)}>
                  <Texto>{n.mensagem}</Texto>
                </Cartao>
              ))
            )}
          </>
        ))}

      {aba === 'PREFERENCIAS' &&
        configuracoes.map((c) => (
          <Cartao key={c.tipoEvento} titulo={rotuloTipo(c.tipoEvento)}>
            <View style={estilos.linha}>
              <Texto>Receber lembretes</Texto>
              <Switch
                accessibilityLabel={`Lembretes de ${rotuloTipo(c.tipoEvento)}`}
                value={c.ativa ?? true}
                onValueChange={(ativa) => void salvar(c, { ativa })}
                trackColor={{ true: cores.secundaria, false: cores.desabilitado }}
              />
            </View>
            {(c.ativa ?? true) && (
              <>
                <Opcoes
                  rotulo={`Canal de ${rotuloTipo(c.tipoEvento)}`}
                  opcoes={[
                    { valor: 'PUSH', rotulo: 'No celular' },
                    { valor: 'EMAIL', rotulo: 'Por e-mail' },
                  ]}
                  valor={c.canal ?? 'PUSH'}
                  aoMudar={(canal) => void salvar(c, { canal: canal as Configuracao['canal'] })}
                />
                <Opcoes
                  rotulo={`Antecedência de ${rotuloTipo(c.tipoEvento)}`}
                  opcoes={ANTECEDENCIAS}
                  valor={String(c.antecedenciaMinutos ?? 0)}
                  aoMudar={(v) => void salvar(c, { antecedenciaMinutos: Number(v) })}
                />
              </>
            )}
          </Cartao>
        ))}
    </Tela>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espaco.md },
});
