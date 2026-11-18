import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alerta, Botao, Campo, Cartao, Texto } from '../componentes';
import { cores, espaco } from '../tema/tokens';

/** Catálogo dos componentes base (UX-02), para conferir estados e acessibilidade. */
export default function Componentes() {
  const [nome, setNome] = useState('');
  const erroNome = nome.length > 0 && nome.length < 2 ? 'Digite pelo menos 2 letras.' : undefined;

  return (
    <SafeAreaView style={estilos.tela}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Texto variante="titulo1">Componentes</Texto>

        <Texto variante="titulo2">Botões</Texto>
        <View style={estilos.grupo}>
          <Botao titulo="Salvar" larguraTotal />
          <Botao titulo="Compartilhar" variante="secundaria" larguraTotal />
          <Botao titulo="Excluir pet" variante="perigo" larguraTotal />
          <Botao titulo="Cancelar" variante="texto" larguraTotal />
          <Botao titulo="Desabilitado" disabled larguraTotal />
          <Botao titulo="Enviando" carregando larguraTotal />
        </View>

        <Texto variante="titulo2">Campos</Texto>
        <View style={estilos.grupo}>
          <Campo rotulo="Nome do pet" placeholder="Ex.: Thor" value={nome} onChangeText={setNome} erro={erroNome} />
          <Campo rotulo="E-mail" ajuda="Usamos para confirmar sua conta." keyboardType="email-address" />
          <Campo rotulo="CPF" erro="CPF inválido. Confira os números." value="123.456.789-00" />
          <Campo rotulo="Espécie" value="Cachorro" desabilitado />
        </View>

        <Texto variante="titulo2">Cartões</Texto>
        <Cartao titulo="Thor" subtitulo="Labrador · 5 anos">
          <Texto variante="legenda">Próxima vacina: V10 em 10/12.</Texto>
        </Cartao>
        <Cartao titulo="Mia" subtitulo="Siamês · 4 anos" aoTocar={() => undefined} />

        <Texto variante="titulo2">Alertas</Texto>
        <View style={estilos.grupo}>
          <Alerta tipo="sucesso" titulo="Vacina registrada" />
          <Alerta tipo="alerta" titulo="Solicitação pendente" mensagem="A clínica ainda não respondeu." />
          <Alerta tipo="erro" titulo="Alergia grave" mensagem="Dipirona: reação grave em 2024." />
          <Alerta tipo="info" titulo="Dica" mensagem="Compartilhe o pet com a clínica antes da consulta." />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.xl, gap: espaco.lg },
  grupo: { gap: espaco.md },
});
