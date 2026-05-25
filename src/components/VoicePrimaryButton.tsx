import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { theme } from '@/styles/theme';

type AppRouteName = keyof RootStackParamList;

type VoicePrimaryButtonProps<RouteName extends AppRouteName> = {
  navigation: NativeStackNavigationProp<RootStackParamList, RouteName>;
};

export function VoicePrimaryButton<RouteName extends AppRouteName>({
  navigation
}: VoicePrimaryButtonProps<RouteName>): React.ReactElement {
  return (
    <Pressable
      accessibilityLabel="Voice control"
      accessibilityRole="button"
      style={styles.button}
      onPress={() => navigation.navigate('Voice')}
    >
      <View style={styles.iconBox}>
        <MaterialIcons name="mic" size={34} color="#FFFFFF" />
      </View>
      <View style={styles.textBox}>
        <Text style={styles.label}>Voice Control</Text>
        <Text style={styles.meta}>AI Command Center</Text>
      </View>
      <MaterialIcons name="arrow-forward-ios" size={18} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 84,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: '#0E2736',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)'
  },
  textBox: {
    flex: 1
  },
  label: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900'
  },
  meta: {
    color: '#E8FBFF',
    fontWeight: '700',
    marginTop: 3
  }
});
