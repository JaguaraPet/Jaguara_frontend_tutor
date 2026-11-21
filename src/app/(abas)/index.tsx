import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Cartao, Tela, Texto } from '../../componentes';
import { useUsuario } from '../../sessao/useUsuario';
import { cores, espaco } from '../../tema/tokens';

/** Tela inicial do tutor: atalhos para as tarefas principais em até 3 toques (RNF06). */
export default function Inicio() {
  const usuario = useUsuario();
  return (
    <Tela titulo="Olá!" subtitulo={`Você entrou como ${usuario?.perfil ?? 'tutor'}.`}>
      <View style={estilos.atalhos}>
        <Cartao
          titulo="Meus pets"
          subtitulo="Saúde, vacinas, medicamentos e rotina"
          aoTocar={() => router.push('/pets')}
        />
        <Cartao
          titulo="Agenda"
          subtitulo="Consultas, lembretes e compromissos"
          aoTocar={() => router.push('/agenda')}
        />
        <Cartao
          titulo="Serviços"
          subtitulo="Encontre clínicas, pet shops e hotéis"
          aoTocar={() => router.push('/servicos')}
        />
      </View>
      <Texto variante="legenda" cor={cores.textoSecundario}>
        Seus próximos cuidados aparecem aqui quando você cadastrar seus pets.
      </Texto>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  atalhos: { gap: espaco.md },
});
