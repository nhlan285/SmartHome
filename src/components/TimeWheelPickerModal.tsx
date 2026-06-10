import React, { useEffect, useMemo, useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { theme } from '@/styles/theme';

type Props = {
  visible: boolean;
  initialTime: string;
  onClose: () => void;
  onConfirm: (time: string) => void;
};

type WheelItem = {
  key: string;
  value: number | null;
  label: string;
};

const ITEM_HEIGHT = 52;
const WHEEL_VISIBLE_ROWS = 5;
const EDGE_SPACER_COUNT = Math.floor(WHEEL_VISIBLE_ROWS / 2);
const LOOP_REPEAT_COUNT = 9;
const MIDDLE_LOOP_INDEX = Math.floor(LOOP_REPEAT_COUNT / 2);

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

const formatTimePart = (value: number): string => value.toString().padStart(2, '0');

const parseTime = (value: string): { hour: number; minute: number } => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    return { hour: 7, minute: 0 };
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
};

const createWheelItems = (values: number[]): WheelItem[] => [
  ...Array.from({ length: EDGE_SPACER_COUNT }, (_, index) => ({
    key: `top-space-${index}`,
    value: null,
    label: ''
  })),
  ...Array.from({ length: LOOP_REPEAT_COUNT }, (_, loopIndex) =>
    values.map((value) => ({
      key: `value-${loopIndex}-${value}`,
      value,
      label: formatTimePart(value)
    }))
  ).flat(),
  ...Array.from({ length: EDGE_SPACER_COUNT }, (_, index) => ({
    key: `bottom-space-${index}`,
    value: null,
    label: ''
  }))
];

const getValueIndex = (values: number[], value: number): number => {
  const valueIndex = values.indexOf(value);
  return valueIndex >= 0 ? valueIndex : 0;
};

const getCenteredDataIndex = (values: number[], value: number): number =>
  EDGE_SPACER_COUNT + MIDDLE_LOOP_INDEX * values.length + getValueIndex(values, value);

const getValueFromDataIndex = (values: number[], dataIndex: number): number => {
  const loopedIndex = dataIndex - EDGE_SPACER_COUNT;
  const normalizedIndex = ((loopedIndex % values.length) + values.length) % values.length;
  return values[normalizedIndex];
};

type WheelColumnProps = {
  label: string;
  selectedValue: number;
  values: number[];
  visible: boolean;
  onChange: (value: number) => void;
};

const WheelColumn: React.FC<WheelColumnProps> = ({
  label,
  selectedValue,
  values,
  visible,
  onChange
}) => {
  const listRef = useRef<FlatList<WheelItem>>(null);
  const items = useMemo(() => createWheelItems(values), [values]);

  const scrollToDataIndex = (dataIndex: number, animated: boolean): void => {
    listRef.current?.scrollToOffset({
      offset: Math.max(0, (dataIndex - EDGE_SPACER_COUNT) * ITEM_HEIGHT),
      animated
    });
  };

  const scrollToValue = (value: number, animated: boolean): void => {
    scrollToDataIndex(getCenteredDataIndex(values, value), animated);
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      scrollToValue(selectedValue, false);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [selectedValue, visible]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const dataIndex = EDGE_SPACER_COUNT + Math.round(offsetY / ITEM_HEIGHT);
    const nextValue = getValueFromDataIndex(values, dataIndex);

    onChange(nextValue);
    scrollToValue(nextValue, false);
  };

  return (
    <View style={styles.wheelColumn}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <View style={styles.wheelFrame}>
        <View pointerEvents="none" style={styles.selectionFrame} />
        <FlatList
          ref={listRef}
          data={items}
          style={styles.wheelList}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.value === null) {
              return <View style={styles.wheelSpacerItem} />;
            }

            const isSelected = item.value === selectedValue;

            return (
              <Pressable
                style={styles.wheelItem}
                onPress={() => {
                  onChange(item.value as number);
                  scrollToValue(item.value as number, true);
                }}
              >
                <Text style={[styles.wheelItemText, isSelected && styles.wheelItemTextSelected]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
          bounces={false}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="start"
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index
          })}
        />
      </View>
    </View>
  );
};

export const TimeWheelPickerModal: React.FC<Props> = ({
  visible,
  initialTime,
  onClose,
  onConfirm
}) => {
  const [selectedHour, setSelectedHour] = useState(7);
  const [selectedMinute, setSelectedMinute] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const parsed = parseTime(initialTime);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
  }, [initialTime, visible]);

  const selectedTime = `${formatTimePart(selectedHour)}:${formatTimePart(selectedMinute)}`;

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.dismissArea} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Chọn giờ hẹn</Text>
            <Text style={styles.subtitle}>Thời gian đang chọn: {selectedTime}</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={20} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.wheelRow}>
          <WheelColumn
            label="Giờ"
            selectedValue={selectedHour}
            values={HOURS}
            visible={visible}
            onChange={setSelectedHour}
          />
          <Text style={styles.timeDivider}>:</Text>
          <WheelColumn
            label="Phút"
            selectedValue={selectedMinute}
            values={MINUTES}
            visible={visible}
            onChange={setSelectedMinute}
          />
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Hủy</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              onConfirm(selectedTime);
              onClose();
            }}
          >
            <Text style={styles.primaryButtonText}>Xong</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 35, 48, 0.46)',
    justifyContent: 'flex-end',
    zIndex: 30
  },
  dismissArea: {
    flex: 1
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 28
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '900'
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontWeight: '700'
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEF4'
  },
  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16
  },
  wheelColumn: {
    flex: 1,
    maxWidth: 144
  },
  wheelLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10
  },
  wheelFrame: {
    height: ITEM_HEIGHT * WHEEL_VISIBLE_ROWS,
    borderRadius: 18,
    backgroundColor: '#F8FCFE',
    overflow: 'hidden'
  },
  wheelList: {
    zIndex: 2
  },
  selectionFrame: {
    position: 'absolute',
    top: ITEM_HEIGHT * EDGE_SPACER_COUNT,
    left: 10,
    right: 10,
    height: ITEM_HEIGHT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBE7E4',
    backgroundColor: '#EAF7F6',
    zIndex: 1
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center'
  },
  wheelSpacerItem: {
    height: ITEM_HEIGHT
  },
  wheelItemText: {
    color: theme.colors.textSecondary,
    fontSize: 24,
    fontWeight: '700'
  },
  wheelItemTextSelected: {
    color: theme.colors.textPrimary,
    fontWeight: '900'
  },
  timeDivider: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 16
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#E8EEF4'
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '800'
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: theme.colors.primary
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800'
  }
});
