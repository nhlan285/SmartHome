import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ControlHistoryItem } from '@/types/models';
import { theme } from '@/styles/theme';
import { formatDateTime } from '@/utils/format';

interface HistoryListProps {
  history: ControlHistoryItem[];
}

export const HistoryList: React.FC<HistoryListProps> = ({ history }) => (
  <FlatList
    data={history}
    keyExtractor={(item) => item.id}
    contentContainerStyle={styles.listContent}
    ListHeaderComponent={
      <View style={styles.tableHeader}>
        <Text style={[styles.headCell, styles.headCellDevice]}>Command</Text>
        <Text style={styles.headCell}>Status</Text>
        <Text style={styles.headCell}>Time</Text>
      </View>
    }
    renderItem={({ item }) => (
      <View style={styles.row}>
        <Text style={[styles.cellText, styles.command]} numberOfLines={1}>
          {item.commandText}
        </Text>
        <View style={[styles.badge, item.status === 'success' ? styles.success : styles.failed]}>
          <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.cellText} numberOfLines={1}>
          {formatDateTime(item.timestamp)}
        </Text>
      </View>
    )}
    ListEmptyComponent={<Text style={styles.empty}>No control history yet.</Text>}
  />
);

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: theme.spacing.xl,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden'
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3FAFE',
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  headCell: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 12
  },
  headCellDevice: {
    flex: 1.6
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#EDF5F9',
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  cellText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 12
  },
  command: {
    flex: 1.6,
    fontWeight: '700'
  },
  badge: {
    flex: 1,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6
  },
  success: {
    backgroundColor: '#DCF7F1'
  },
  failed: {
    backgroundColor: '#E6F3FF'
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 11,
    color: theme.colors.textPrimary
  },
  empty: {
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    color: theme.colors.textSecondary
  }
});
