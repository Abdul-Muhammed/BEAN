import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface InlineDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  maxDate?: Date;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function InlineDatePicker({
  value,
  onChange,
  maxDate,
}: InlineDatePickerProps) {
  const today = startOfDay(new Date());
  const max = maxDate ? startOfDay(maxDate) : null;

  const [viewMonth, setViewMonth] = useState(
    new Date(value.getFullYear(), value.getMonth(), 1)
  );

  const monthCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [viewMonth]);

  const canGoNext = useMemo(() => {
    if (!max) return true;
    const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    return nextMonth <= new Date(max.getFullYear(), max.getMonth(), 1);
  }, [viewMonth, max]);

  const handleSelectDay = (date: Date) => {
    if (max && date > max) return;
    onChange(date);
  };

  const goPrevMonth = () => {
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
    );
  };

  const goNextMonth = () => {
    if (!canGoNext) return;
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
    );
  };

  const handleToday = () => {
    const t = startOfDay(new Date());
    setViewMonth(new Date(t.getFullYear(), t.getMonth(), 1));
    onChange(t);
  };

  const handleYesterday = () => {
    const y = startOfDay(new Date());
    y.setDate(y.getDate() - 1);
    setViewMonth(new Date(y.getFullYear(), y.getMonth(), 1));
    onChange(y);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goPrevMonth}
          style={styles.navButton}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <ChevronLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </Text>
        <TouchableOpacity
          onPress={goNextMonth}
          style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
          disabled={!canGoNext}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <ChevronRight
            size={20}
            color={canGoNext ? colors.primary : colors.disabled}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Text key={`${label}-${index}`} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {monthCells.map((cell, index) => {
          if (!cell) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }
          const isSelected = isSameDay(cell, value);
          const isToday = isSameDay(cell, today);
          const isDisabled = !!max && cell > max;

          return (
            <TouchableOpacity
              key={cell.toISOString()}
              style={styles.dayCell}
              onPress={() => handleSelectDay(cell)}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.dayCircle,
                  isToday && !isSelected && styles.dayCircleToday,
                  isSelected && styles.dayCircleSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isDisabled && styles.dayTextDisabled,
                    isToday && !isSelected && styles.dayTextToday,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {cell.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={handleToday}
          activeOpacity={0.85}
        >
          <Text style={styles.quickButtonText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={handleYesterday}
          activeOpacity={0.85}
        >
          <Text style={styles.quickButtonText}>Yesterday</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginTop: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.warmBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmSurface,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    color: colors.primary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Lato-Bold',
    color: colors.mutedText,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Lato-Regular',
    color: colors.primary,
  },
  dayTextToday: {
    fontFamily: 'Lato-Bold',
  },
  dayTextSelected: {
    color: colors.white,
    fontFamily: 'Lato-Bold',
  },
  dayTextDisabled: {
    color: colors.disabled,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    fontFamily: 'Lato-Bold',
    color: colors.white,
  },
});
