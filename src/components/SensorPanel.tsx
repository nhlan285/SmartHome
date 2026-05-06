import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SensorData } from '@/types/models';
import { theme } from '@/styles/theme';
import { formatGas, formatPercent, formatTemp } from '@/utils/format';

interface SensorPanelProps {
  sensors: SensorData;
}

export const SensorPanel: React.FC<SensorPanelProps> = ({ sensors }) => (
  <View style={styles.card}>
    <Text style={styles.title}>Sensor Data</Text>
    <View style={styles.row}>
      <View style={styles.item}>
        <Text style={styles.label}>Temperature</Text>
        <Text style={styles.value}>{formatTemp(sensors.temperatureC)}</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Humidity</Text>
        <Text style={styles.value}>{formatPercent(sensors.humidityPercent)}</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.label}>Gas</Text>
        <Text style={styles.value}>{formatGas(sensors.gasPpm)}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm
  },
  item: {
    flex: 1,
    backgroundColor: '#F7FAFD',
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 12
  },
  value: {
    marginTop: 4,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  }
});
