import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../src/theme/colors';

export default function TodoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>To Do Page</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  text: { fontSize: 18, fontWeight: '600' }
});