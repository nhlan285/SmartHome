import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VoiceCommandResult } from '@/types/models';
import { theme } from '@/styles/theme';
import { buildDeviceName, extractRoomDeviceFromDeviceId } from '@/services/api/esp32Contract';

interface VoiceCommandResultCardProps {
  result: VoiceCommandResult;
}

const ENTITY_LABELS: Record<string, string> = {
  action: 'Hành động',
  device: 'Thiết bị',
  deviceId: 'Thiết bị',
  location: 'Vị trí',
  room: 'Phòng'
};

const getIntentLabel = (intent: string): string => {
  if (intent === 'device_control') {
    return 'Điều khiển thiết bị';
  }

  return intent;
};

const formatEntityValue = (key: string, value: string | number | boolean): string => {
  if (key === 'action') {
    if (value === 'on' || value === 'ON' || value === true) {
      return 'Bật';
    }

    if (value === 'off' || value === 'OFF' || value === false) {
      return 'Tắt';
    }
  }

  if (key === 'deviceId' && typeof value === 'string') {
    const parsed = extractRoomDeviceFromDeviceId(value);
    return parsed ? buildDeviceName(parsed.room, parsed.device) : value;
  }

  return String(value);
};

const formatEntities = (entities: VoiceCommandResult['entities']): string =>
  Object.entries(entities)
    .map(([key, value]) => {
      const label = ENTITY_LABELS[key] ?? key;
      return `${label}: ${formatEntityValue(key, value)}`;
    })
    .join('\n');

export const VoiceCommandResultCard: React.FC<VoiceCommandResultCardProps> = ({ result }) => (
  <View style={styles.card}>
    <Text style={styles.title}>Kết quả nhận diện</Text>
    <Text style={styles.label}>Văn bản nhận diện</Text>
    <Text style={styles.value}>{result.transcript}</Text>

    <View style={styles.row}>
      <View style={styles.chip}>
        <Text style={styles.chipText}>Ý định: {getIntentLabel(result.intent)}</Text>
      </View>
      <View style={styles.chip}>
        <Text style={styles.chipText}>Độ tin cậy: {(result.confidence * 100).toFixed(1)}%</Text>
      </View>
    </View>

    <Text style={styles.label}>Thông tin trích xuất</Text>
    <Text style={styles.entityText}>{formatEntities(result.entities)}</Text>

    {result.suggestedAction ? (
      <>
        <Text style={styles.label}>Hành động đề xuất</Text>
        <Text style={styles.value}>{result.suggestedAction}</Text>
      </>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm
  },
  label: {
    marginTop: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  value: {
    color: theme.colors.textPrimary,
    marginTop: 4
  },
  row: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap'
  },
  chip: {
    backgroundColor: '#EAF0FE',
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  chipText: {
    color: theme.colors.primary,
    fontWeight: '700'
  },
  entityText: {
    marginTop: 4,
    color: theme.colors.textPrimary,
    backgroundColor: '#F7FAFD',
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    fontFamily: 'monospace'
  }
});
