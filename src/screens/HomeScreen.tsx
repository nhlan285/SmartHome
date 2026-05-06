import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { DeviceCard } from '@/components/DeviceCard';
import { SensorPanel } from '@/components/SensorPanel';
import { controlDevice, getDashboardState, triggerBackendCommandLog } from '@/services/api/deviceApi';
import { useDeviceSocket } from '@/hooks/useDeviceSocket';
import { DashboardSnapshot, DeviceState } from '@/types/models';
import { theme } from '@/styles/theme';

export const HomeScreen: React.FC = () => {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, latestSnapshot } = useDeviceSocket();

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const data = await getDashboardState();
      setSnapshot(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load dashboard data.';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (latestSnapshot) {
      setSnapshot(latestSnapshot);
    }
  }, [latestSnapshot]);

  const handleRefresh = (): void => {
    setIsRefreshing(true);
    void loadDashboard();
  };

  const handleToggle = async (device: DeviceState): Promise<void> => {
    const nextAction = device.status === 'on' ? 'off' : 'on';
    setPendingDeviceId(device.deviceId);

    try {
      const updated = await controlDevice({ deviceId: device.deviceId, action: nextAction });
      setSnapshot((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          devices: current.devices.map((item) =>
            item.deviceId === updated.deviceId ? updated : item
          )
        };
      });

      await triggerBackendCommandLog({ deviceId: updated.deviceId, action: updated.status });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to control device.';
      setError(message);
    } finally {
      setPendingDeviceId(null);
    }
  };

  const connectionText = useMemo(
    () => (isConnected ? 'Live updates connected' : 'WebSocket disconnected'),
    [isConnected]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.heading}>Smart Home Dashboard</Text>
        <View style={[styles.connectionPill, isConnected ? styles.connected : styles.disconnected]}>
          <Text style={styles.connectionText}>{connectionText}</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : snapshot ? (
          <>
            <SensorPanel sensors={snapshot.sensors} />
            <Text style={styles.sectionTitle}>Devices</Text>
            {snapshot.devices.map((device) => (
              <DeviceCard
                key={device.deviceId}
                device={device}
                onToggle={handleToggle}
                isBusy={pendingDeviceId === device.deviceId}
              />
            ))}
          </>
        ) : (
          <Text style={styles.empty}>No dashboard data found.</Text>
        )}
      </ScrollView>
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
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm
  },
  connectionPill: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: theme.spacing.md
  },
  connected: {
    backgroundColor: '#DDF7E7'
  },
  disconnected: {
    backgroundColor: '#FFE5E5'
  },
  connectionText: {
    color: theme.colors.textPrimary,
    fontWeight: '700'
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700'
  },
  loader: {
    marginTop: theme.spacing.lg
  },
  errorText: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.md
  },
  empty: {
    color: theme.colors.textSecondary
  }
});
