import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeviceState } from '@/types/models';
import { theme } from '@/styles/theme';

interface DeviceCardProps {
  device: DeviceState;
  isBusy: boolean;
  onToggle: (device: DeviceState) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, isBusy, onToggle }) => {
  const isOn = device.status === 'on';

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.name}>{device.name}</Text>
        <Text style={styles.meta}>State: {isOn ? 'ON' : 'OFF'}</Text>
      </View>

      <Pressable
        style={[styles.button, isOn ? styles.buttonOn : styles.buttonOff, isBusy && styles.buttonDisabled]}
        onPress={() => onToggle(device)}
        disabled={isBusy}
      >
        <Text style={styles.buttonText}>{isBusy ? '...' : isOn ? 'Turn Off' : 'Turn On'}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  name: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  meta: {
    color: theme.colors.textSecondary,
    marginTop: 4
  },
  button: {
    minWidth: 88,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8
  },
  buttonOn: {
    backgroundColor: theme.colors.warning
  },
  buttonOff: {
    backgroundColor: theme.colors.primary
  },
  buttonDisabled: {
    opacity: 0.65
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700'
  }
});
