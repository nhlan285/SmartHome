import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppColorMode = 'light' | 'dark';

export interface AccountProfile {
  displayName: string;
  avatarInitial: string;
}

interface AppSettingsState {
  colorMode: AppColorMode;
  wifiId: string;
  profile: AccountProfile;
}

interface AppSettingsContextValue extends AppSettingsState {
  isDarkMode: boolean;
  isSettingsReady: boolean;
  settingsError: string;
  toggleColorMode: () => void;
  updateWifiId: (wifiId: string) => void;
  resetWifiId: () => void;
  updateProfile: (profile: AccountProfile) => void;
}

const DEFAULT_WIFI_ID = 'SMART_HOME_WIFI';

const DEFAULT_SETTINGS: AppSettingsState = {
  colorMode: 'light',
  wifiId: DEFAULT_WIFI_ID,
  profile: {
    displayName: 'Smart Home User',
    avatarInitial: 'B'
  }
};

const STORAGE_KEY = '@smart-home/app-settings/v1';

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

const normalizeAvatarInitial = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_SETTINGS.profile.avatarInitial;
  }

  return trimmed[0].toUpperCase();
};

const normalizeProfile = (value: Partial<AccountProfile> | undefined): AccountProfile => ({
  displayName: value?.displayName?.trim() || DEFAULT_SETTINGS.profile.displayName,
  avatarInitial: normalizeAvatarInitial(value?.avatarInitial ?? DEFAULT_SETTINGS.profile.avatarInitial)
});

const parseStoredSettings = (raw: string): AppSettingsState => {
  const parsed = JSON.parse(raw) as Partial<AppSettingsState>;
  const colorMode: AppColorMode = parsed.colorMode === 'dark' ? 'dark' : 'light';
  const wifiId = typeof parsed.wifiId === 'string' && parsed.wifiId.trim()
    ? parsed.wifiId.trim()
    : DEFAULT_WIFI_ID;

  return {
    colorMode,
    wifiId,
    profile: normalizeProfile(parsed.profile)
  };
};

export const AppSettingsProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettingsState>(DEFAULT_SETTINGS);
  const [isSettingsReady, setIsSettingsReady] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async (): Promise<void> => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) {
          return;
        }

        if (raw) {
          setSettings(parseStoredSettings(raw));
        }

        setSettingsError('');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Khong the doc cai dat.';
        setSettingsError(message);
      } finally {
        if (isMounted) {
          setIsSettingsReady(true);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSettingsReady) {
      return;
    }

    const saveSettings = async (): Promise<void> => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        setSettingsError('');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Khong the luu cai dat.';
        setSettingsError(message);
      }
    };

    void saveSettings();
  }, [isSettingsReady, settings]);

  const toggleColorMode = useCallback((): void => {
    setSettings((current) => ({
      ...current,
      colorMode: current.colorMode === 'light' ? 'dark' : 'light'
    }));
  }, []);

  const updateWifiId = useCallback((wifiId: string): void => {
    setSettings((current) => ({
      ...current,
      wifiId
    }));
  }, []);

  const resetWifiId = useCallback((): void => {
    setSettings((current) => ({
      ...current,
      wifiId: DEFAULT_WIFI_ID
    }));
  }, []);

  const updateProfile = useCallback((profile: AccountProfile): void => {
    setSettings((current) => ({
      ...current,
      profile: normalizeProfile(profile)
    }));
  }, []);

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      ...settings,
      isDarkMode: settings.colorMode === 'dark',
      isSettingsReady,
      settingsError,
      toggleColorMode,
      updateWifiId,
      resetWifiId,
      updateProfile
    }),
    [
      isSettingsReady,
      resetWifiId,
      settings,
      settingsError,
      toggleColorMode,
      updateProfile,
      updateWifiId
    ]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
};

export const useAppSettings = (): AppSettingsContextValue => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings phai duoc dung trong AppSettingsProvider');
  }

  return context;
};
