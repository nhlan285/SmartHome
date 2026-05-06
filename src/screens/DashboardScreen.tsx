import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { getDeviceState } from '@/services/api/deviceApi';
import { connectWebSocket } from '@/services/realtime/websocketService';
import { theme } from '@/styles/theme';
import { DashboardSnapshot } from '@/types/models';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;
const GAS_ALERT_THRESHOLD = 1500;

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGasAlertModalVisible, setIsGasAlertModalVisible] = useState(false);

  const refreshState = async (): Promise<void> => {
    try {
      setError(null);
      const data = await getDeviceState();
      setSnapshot(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Khong the refresh dashboard.';
      setError(message);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialState = async (): Promise<void> => {
      try {
        setError(null);
        const data = await getDeviceState();
        if (isMounted) {
          setSnapshot(data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Khong the tai state ban dau.';
        if (isMounted) {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialState();

    const unsubscribe = connectWebSocket((realtimeData) => {
      // Neu khong setState tai callback, UI se khong tu update theo realtime.
      setSnapshot(realtimeData);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const temperature = snapshot?.sensors.temperatureC ?? '-';
  const humidity = snapshot?.sensors.humidityPercent ?? '-';
  const gas = snapshot?.sensors.gasPpm ?? '-';
  const gasNumber = snapshot?.sensors.gasPpm;
  const isGasDanger = typeof gasNumber === 'number' && gasNumber > GAS_ALERT_THRESHOLD;

  useEffect(() => {
    if (isGasDanger) {
      setIsGasAlertModalVisible(true);
    }
  }, [isGasDanger]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.loadingText}>Dang tai du lieu dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cityDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const deviceCards = (snapshot?.devices ?? []).map((device) => ({
    title: device.name,
    status: device.status.toUpperCase()
  }));

  const lastUpdated = snapshot?.sensors.updatedAt
    ? new Date(snapshot.sensors.updatedAt).toLocaleTimeString()
    : '--:--';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good Evening,</Text>
            <Text style={styles.title}>Smart Home</Text>
          </View>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>B</Text>
          </View>
        </View>

        <View style={[styles.climateCard, isGasDanger && styles.climateCardDanger]}>
          <View style={styles.climateTopRow}>
            <Text style={styles.cityText}>
              In <Text style={styles.cityAccent}>Da Nang</Text>
            </Text>
            <Text style={styles.dateText}>{cityDate}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.metricRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Temperature</Text>
              <Text style={styles.metricValue}>{temperature}°C</Text>
            </View>
            <View style={[styles.metricBox, styles.metricHighlight]}>
              <Text style={styles.metricLabelLight}>Humidity</Text>
              <Text style={styles.metricValueLight}>{humidity}%</Text>
            </View>
            <View style={[styles.metricBox, isGasDanger && styles.metricGasDanger]}>
              <Text style={styles.metricLabel}>Gas</Text>
              <Text style={[styles.metricValue, isGasDanger && styles.metricGasValueDanger]}>{gas}</Text>
            </View>
          </View>

          <Text style={styles.noteText}>Realtime update: {lastUpdated}</Text>

          {isGasDanger ? (
            <Pressable
              style={styles.gasWarningBanner}
              onPress={() => setIsGasAlertModalVisible(true)}
            >
              <Text style={styles.gasWarningTitle}>CANH BAO: KHI GAS VUOT NGUONG</Text>
              <Text style={styles.gasWarningBody}>
                Gas hien tai {gasNumber} ppm, lon hon nguong {GAS_ALERT_THRESHOLD} ppm.
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Smart Devices</Text>
          <Pressable onPress={() => void refreshState()}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {deviceCards.length === 0 ? (
          <Text style={styles.noteText}>Chua co du lieu trang thai thiet bi.</Text>
        ) : null}

        <View style={styles.grid}>
          {deviceCards.map((card) => {
            const isOn = card.status === 'ON';
            return (
              <View key={card.title} style={[styles.deviceCard, isOn && styles.deviceCardActive]}>
                <Text style={styles.deviceTitle}>{card.title}</Text>
                <View style={[styles.statusBadge, isOn ? styles.statusOn : styles.statusOff]}>
                  <Text style={styles.statusText}>{card.status}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.navRow}>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Control')}>
            <Text style={styles.navButtonText}>Control</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Voice')}>
            <Text style={styles.navButtonText}>Voice</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('History')}>
            <Text style={styles.navButtonText}>History</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => navigation.navigate('Schedule')}>
            <Text style={styles.navButtonText}>Schedule</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={isGasAlertModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGasAlertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>CANH BAO KHI GAS</Text>
            <Text style={styles.modalValue}>{gasNumber ?? '--'} ppm</Text>
            <Text style={styles.modalMessage}>
              He thong da nhan muc gas vuot nguong an toan ({GAS_ALERT_THRESHOLD} ppm).
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setIsGasAlertModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Da hieu</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  greeting: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E2736',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  headerIconText: {
    color: theme.colors.primary,
    fontWeight: '700'
  },
  climateCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    shadowColor: '#0A2A40',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  climateCardDanger: {
    borderColor: '#F26F7D',
    backgroundColor: '#FFF2F4'
  },
  climateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  cityText: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.textPrimary
  },
  cityAccent: {
    color: theme.colors.warning
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8
  },
  metricBox: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#F5FBFE',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm
  },
  metricGasDanger: {
    borderColor: '#F26F7D',
    backgroundColor: '#FFE3E7'
  },
  metricHighlight: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  metricLabel: {
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  metricValue: {
    marginTop: 6,
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: '800'
  },
  metricGasValueDanger: {
    color: '#B31D3C'
  },
  metricLabelLight: {
    color: '#E8FBFF',
    fontWeight: '600'
  },
  metricValueLight: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800'
  },
  sectionHeaderRow: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: theme.colors.textPrimary
  },
  refreshText: {
    color: theme.colors.warning,
    fontWeight: '700'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  deviceCard: {
    width: '48%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    minHeight: 104,
    justifyContent: 'space-between'
  },
  deviceCardActive: {
    backgroundColor: '#DEF6FB',
    borderColor: '#9BE1F0'
  },
  deviceTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '700'
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  statusOn: {
    backgroundColor: '#D8F8F0'
  },
  statusOff: {
    backgroundColor: '#E8EEF4'
  },
  statusText: {
    color: theme.colors.textPrimary,
    fontWeight: '700'
  },
  loadingText: {
    marginTop: 8,
    color: theme.colors.textSecondary
  },
  noteText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: 2
  },
  gasWarningBanner: {
    marginTop: theme.spacing.sm,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F26F7D',
    backgroundColor: '#FFDEE3',
    padding: 10
  },
  gasWarningTitle: {
    color: '#B31D3C',
    fontSize: 14,
    fontWeight: '800'
  },
  gasWarningBody: {
    marginTop: 4,
    color: '#B31D3C',
    fontWeight: '600'
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.sm,
    marginTop: 2
  },
  navRow: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 8
  },
  navButton: {
    flexGrow: 1,
    flexBasis: '22%',
    backgroundColor: '#E3F7FD',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center'
  },
  navButtonText: {
    color: theme.colors.primary,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(60, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    backgroundColor: '#B31D3C',
    borderWidth: 2,
    borderColor: '#FFD3DA',
    padding: 18,
    alignItems: 'center'
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900'
  },
  modalValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900'
  },
  modalMessage: {
    marginTop: 8,
    color: '#FFE8EC',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '600'
  },
  modalButton: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  modalButtonText: {
    color: '#B31D3C',
    fontWeight: '800'
  }
});
