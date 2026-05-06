import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VoiceCommandResult } from '@/types/models';
import { theme } from '@/styles/theme';

interface VoiceCommandResultCardProps {
  result: VoiceCommandResult;
}

export const VoiceCommandResultCard: React.FC<VoiceCommandResultCardProps> = ({ result }) => (
  <View style={styles.card}>
    <Text style={styles.title}>Recognized Result</Text>
    <Text style={styles.label}>Transcript</Text>
    <Text style={styles.value}>{result.transcript}</Text>

    <View style={styles.row}>
      <View style={styles.chip}>
        <Text style={styles.chipText}>Intent: {result.intent}</Text>
      </View>
      <View style={styles.chip}>
        <Text style={styles.chipText}>Confidence: {(result.confidence * 100).toFixed(1)}%</Text>
      </View>
    </View>

    <Text style={styles.label}>Entities</Text>
    <Text style={styles.entityText}>{JSON.stringify(result.entities, null, 2)}</Text>

    {result.suggestedAction ? (
      <>
        <Text style={styles.label}>Suggested Action</Text>
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
