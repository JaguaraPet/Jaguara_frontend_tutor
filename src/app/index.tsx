import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Inicio() {
  return (
    <SafeAreaView style={estilos.tela}>
      <View style={estilos.conteudo}>
        <Text style={estilos.titulo}>Jaguara</Text>
        <Text style={estilos.texto}>Saúde, rotina e cuidados do seu pet em um só lugar.</Text>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#FFFFFF' },
  conteudo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  titulo: { fontSize: 28, fontWeight: '700', color: '#5E3209' },
  texto: { fontSize: 16, lineHeight: 24, color: '#5C554E', textAlign: 'center' },
});
