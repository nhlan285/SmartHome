import React, { useCallback, useEffect, useMemo, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppNavBar } from '@/components/AppNavBar';
import { useAppSettings } from '@/context/AppSettingsContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { getControlHistory } from '@/services/api/historyApi';
import { theme } from '@/styles/theme';
import { ControlHistoryItem } from '@/types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;
type RangeMode = 'daily' | 'weekly';

type ActivityRow = {
  id: string;
  device: string;
  action: string;
  timestamp: string;
  source: string;
};

const startOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getWeekStart = (date: Date): Date => {
  const start = startOfDay(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  return start;
};

const getDateLabel = (date: Date, mode: RangeMode): string => {
  if (mode === 'daily') {
    return date.toLocaleDateString('vi-VN');
  }

  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${start.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit'
  })} - ${end.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })}`;
};

const deriveAction = (commandText: string, status: ControlHistoryItem['status']): string => {
  const normalized = commandText.toLocaleLowerCase('vi-VN');

  if (normalized.includes('turn_on') || normalized.includes('bật') || normalized.includes(' on')) {
    return status === 'success' ? 'Bật' : 'Bật lỗi';
  }

  if (normalized.includes('turn_off') || normalized.includes('tắt') || normalized.includes(' off')) {
    return status === 'success' ? 'Tắt' : 'Tắt lỗi';
  }

  return status === 'success' ? 'Thành công' : 'Thất bại';
};

const deriveDevice = (commandText: string): string => {
  const cleaned = commandText
    .replace(/turn_on|turn_off|turn on|turn off/gi, '')
    .replace(/\bbật\b|\btắt\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'Thiết bị';
};

const getSourceLabel = (source: ControlHistoryItem['source']): string =>
  source === 'voice' ? 'Giọng nói' : 'Thủ công';

const isItemInRange = (item: ControlHistoryItem, selectedDate: Date, mode: RangeMode): boolean => {
  const itemTime = new Date(item.timestamp).getTime();

  if (Number.isNaN(itemTime)) {
    return false;
  }

  const start = mode === 'daily' ? startOfDay(selectedDate) : getWeekStart(selectedDate);
  const end = new Date(start);
  end.setDate(start.getDate() + (mode === 'daily' ? 1 : 7));

  return itemTime >= start.getTime() && itemTime < end.getTime();
};

export const HistoryScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useAppSettings();
  const [history, setHistory] = useState<ControlHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeMode, setRangeMode] = useState<RangeMode>('daily');
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response = await getControlHistory();
      setHistory(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải lịch sử điều khiển.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const filteredHistory = useMemo(
    () => history.filter((item) => isItemInRange(item, selectedDate, rangeMode)),
    [history, rangeMode, selectedDate]
  );

  const activityRows = useMemo<ActivityRow[]>(
    () =>
      filteredHistory.map((item) => ({
        id: item.id,
        device: deriveDevice(item.commandText),
        action: deriveAction(item.commandText, item.status),
        timestamp: new Date(item.timestamp).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        source: getSourceLabel(item.source)
      })),
    [filteredHistory]
  );

  const chartData = useMemo(() => {
    const counts = new Map<string, number>();
    activityRows.forEach((item) => {
      counts.set(item.device, (counts.get(item.device) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 4);
  }, [activityRows]);

  const maxCount = chartData.reduce((max, item) => Math.max(max, item.count), 0);
  const topDevice = chartData[0]?.device ?? 'Chưa có';

  const moveDate = (direction: -1 | 1): void => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + direction * (rangeMode === 'daily' ? 1 : 7));
      return next;
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="Quay lại menu"
            accessibilityRole="button"
            style={styles.backButton}
            onPress={() => navigation.navigate('Menu')}
          >
            <MaterialIcons name="arrow-back" size={30} color={theme.colors.primary} />
          </Pressable>
          <Text style={styles.title}>Thống kê lịch sử</Text>
          <Pressable
            accessibilityLabel="Làm mới lịch sử"
            accessibilityRole="button"
            style={styles.refreshIconButton}
            onPress={() => {
              setIsLoading(true);
              void loadHistory();
            }}
          >
            <MaterialIcons name="refresh" size={24} color={theme.colors.warning} />
          </Pressable>
        </View>

        <View style={styles.segmentRow}>
          <Pressable
            style={[styles.segmentButton, rangeMode === 'daily' && styles.segmentSelected]}
            onPress={() => setRangeMode('daily')}
          >
            <Text style={[styles.segmentText, rangeMode === 'daily' && styles.segmentTextSelected]}>
              Theo ngày
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentButton, rangeMode === 'weekly' && styles.segmentSelected]}
            onPress={() => setRangeMode('weekly')}
          >
            <Text style={[styles.segmentText, rangeMode === 'weekly' && styles.segmentTextSelected]}>
              Theo tuần
            </Text>
          </Pressable>
        </View>

        <View style={styles.dateNav}>
          <Pressable style={styles.dateButton} onPress={() => moveDate(-1)}>
            <MaterialIcons name="chevron-left" size={22} color={theme.colors.warning} />
            <Text style={styles.dateButtonText}>Trước</Text>
          </Pressable>
          <Text style={styles.dateText}>{getDateLabel(selectedDate, rangeMode)}</Text>
          <Pressable style={styles.dateButton} onPress={() => moveDate(1)}>
            <Text style={styles.dateButtonText}>Sau</Text>
            <MaterialIcons name="chevron-right" size={22} color="#D7D4D1" />
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Đang tải thống kê...</Text>
          </View>
        ) : (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>
                {rangeMode === 'daily' ? 'Số lần sử dụng theo thiết bị' : 'Số lần sử dụng trong tuần'}
              </Text>
              {chartData.length === 0 ? (
                <Text style={styles.emptyText}>Chưa có hoạt động trong khoảng thời gian này.</Text>
              ) : (
                <View style={styles.chartArea}>
                  {chartData.map((item, index) => {
                    const height = maxCount > 0 ? Math.max(12, (item.count / maxCount) * 124) : 12;
                    const colors = ['#C78BB1', '#F4D789', '#8FB6D6', '#C8D09E'];

                    return (
                      <View key={item.device} style={styles.barColumn}>
                        <Text style={styles.barValue}>{item.count}</Text>
                        <View style={[styles.bar, { height, backgroundColor: colors[index] }]} />
                        <Text style={styles.barLabel} numberOfLines={1}>
                          {item.device}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.overviewCard}>
              <Text style={styles.cardTitle}>Tổng quan đã chọn</Text>
              <View style={styles.overviewRow}>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewNumber}>{activityRows.length}</Text>
                  <Text style={styles.overviewLabel}>Tổng hoạt động</Text>
                </View>
                <View style={styles.overviewItem}>
                  <Text style={styles.overviewDevice} numberOfLines={1}>
                    {topDevice}
                  </Text>
                  <Text style={styles.overviewLabel}>Thiết bị dùng nhiều</Text>
                </View>
              </View>
            </View>

            <View style={styles.tableCard}>
              <Text style={styles.cardTitle}>Hoạt động chi tiết</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.headCell, styles.deviceCell]}>Thiết bị</Text>
                <Text style={styles.headCell}>Hành động</Text>
                <Text style={styles.headCell}>Thời gian</Text>
                <Text style={styles.headCell}>Nguồn</Text>
              </View>
              {activityRows.length === 0 ? (
                <Text style={styles.tableEmpty}>Không có bản ghi.</Text>
              ) : (
                activityRows.slice(0, 12).map((item) => (
                  <View key={item.id} style={styles.tableRow}>
                    <Text style={[styles.bodyCell, styles.deviceCell]} numberOfLines={1}>
                      {item.device}
                    </Text>
                    <Text style={styles.bodyCell} numberOfLines={1}>
                      {item.action}
                    </Text>
                    <Text style={styles.bodyCell} numberOfLines={2}>
                      {item.timestamp}
                    </Text>
                    <Text style={styles.bodyCell} numberOfLines={1}>
                      {item.source}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <AppNavBar navigation={navigation} currentRoute="History" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  safeAreaDark: {
    backgroundColor: '#101D25'
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 156
  },
  headerRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  backButton: {
    position: 'absolute',
    left: 0,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center'
  },
  refreshIconButton: {
    position: 'absolute',
    right: 0,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '900'
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#E8F0EF',
    padding: 3,
    marginBottom: 16
  },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentSelected: {
    backgroundColor: theme.colors.primary
  },
  segmentText: {
    color: theme.colors.textSecondary,
    fontWeight: '900'
  },
  segmentTextSelected: {
    color: '#FFFFFF'
  },
  dateNav: {
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EBE9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 16
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dateButtonText: {
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: '900'
  },
  dateText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 32
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontWeight: '700'
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: 10,
    fontWeight: '800'
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EBE9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14
  },
  chartArea: {
    minHeight: 182,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E6EFED',
    paddingTop: 12,
    paddingHorizontal: 6
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  barValue: {
    color: '#C8C8C8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4
  },
  bar: {
    width: 28,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  barLabel: {
    maxWidth: 70,
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700'
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EBE9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14
  },
  overviewRow: {
    flexDirection: 'row'
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center'
  },
  overviewNumber: {
    color: theme.colors.primary,
    fontSize: 21,
    fontWeight: '900'
  },
  overviewDevice: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '900'
  },
  overviewLabel: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EBE9',
    borderRadius: 16,
    padding: 12
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F7F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAF1F0',
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  headCell: {
    flex: 1,
    color: '#737373',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center'
  },
  bodyCell: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center'
  },
  deviceCell: {
    flex: 1.35,
    textAlign: 'left'
  },
  tableEmpty: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 18,
    fontWeight: '700'
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
    fontWeight: '700'
  }
});
