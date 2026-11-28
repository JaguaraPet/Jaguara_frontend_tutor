import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { api } from '../api/cliente';
import type { components } from '../api/esquema';
import { Alerta, Botao, Cartao, Tela, Texto } from '../componentes';
import { mensagemDaApi } from '../pets/erros';
import { pendentes } from '../privacidade/termos';
import { sessao } from '../sessao/sessao';
import { cores } from '../tema/tokens';

type Consentimento = components['schemas']['Consentimento'];
type Termo = components['schemas']['Termo'];

/** CT-46-03: o tutor aceita a versão nova dos termos para seguir usando o app. */
export default function TermosPendentes() {
  const [termos, setTermos] = useState<(Consentimento & { conteudo?: string })[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aceitando, setAceitando] = useState(false);

  useEffect(() => {
    void Promise.all([
      api.GET('/privacidade/consentimentos'),
      api.GET('/termos/vigentes', { params: { query: { tipo: 'TERMOS_USO_APP' } } }),
      api.GET('/termos/vigentes', { params: { query: { tipo: 'POLITICA_PRIVACIDADE' } } }),
    ]).then(([c, t1, t2]) => {
      const textos = new Map<string, Termo>([...(t1.data ?? []), ...(t2.data ?? [])].map((t) => [t.id!, t]));
      setTermos(pendentes(c.data ?? []).map((p) => ({ ...p, conteudo: textos.get(p.termoId!)?.conteudo })));
    });
  }, []);

  async function aceitar() {
    if (!termos) return;
    setAceitando(true);
    const { error } = await api.PUT('/privacidade/consentimentos', {
      body: termos.map((t) => ({ termoId: t.termoId!, aceito: true })),
    });
    setAceitando(false);
    if (error) {
      setErro(mensagemDaApi(error));
      return;
    }
    router.replace('/');
  }

  if (termos === null) {
    return (
      <Tela titulo="Termos atualizados">
        <ActivityIndicator color={cores.destaque} accessibilityLabel="Carregando os termos" />
      </Tela>
    );
  }

  return (
    <Tela titulo="Termos atualizados" subtitulo="Para continuar, leia e aceite a nova versão.">
      {erro && <Alerta tipo="erro" titulo="Aceite não registrado" mensagem={erro} />}
      {termos.map((t) => (
        <Cartao key={t.termoId} titulo={t.titulo} subtitulo={`Versão ${t.versao}`}>
          {t.conteudo ? <Texto variante="legenda">{t.conteudo}</Texto> : null}
        </Cartao>
      ))}
      <Botao titulo="Li e aceito" larguraTotal carregando={aceitando} onPress={() => void aceitar()} />
      <Botao
        titulo="Sair da conta"
        variante="texto"
        onPress={() => void sessao.sair().then(() => router.replace('/boas-vindas'))}
      />
    </Tela>
  );
}
