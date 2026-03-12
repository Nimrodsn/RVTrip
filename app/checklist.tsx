import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { strings } from '../src/constants/strings';
import { loadChecklist, saveChecklist } from '../src/services/storage';

const ITEMS = [
  { key: 'roofHatch', label: strings.checklist.roofHatch },
  { key: 'stepRetracted', label: strings.checklist.stepRetracted },
  { key: 'gasOff', label: strings.checklist.gasOff },
  { key: 'cabinetsLocked', label: strings.checklist.cabinetsLocked },
  { key: 'greyWaterEmpty', label: strings.checklist.greyWaterEmpty },
  { key: 'waterFull', label: strings.checklist.waterFull },
  { key: 'fridgeOk', label: strings.checklist.fridgeOk },
  { key: 'tiresOk', label: strings.checklist.tiresOk },
];

export default function ChecklistScreen() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadChecklist().then(setChecked);
  }, []);

  const toggle = useCallback((key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveChecklist(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    const empty: Record<string, boolean> = {};
    setChecked(empty);
    saveChecklist(empty);
  }, []);

  const doneCount = ITEMS.filter((i) => checked[i.key]).length;
  const allDone = doneCount === ITEMS.length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={[styles.statusBar, allDone ? styles.statusDone : styles.statusPending]}>
        <Text style={styles.statusText}>
          {allDone ? '✅ ' + strings.checklist.allDone : `${doneCount}/${ITEMS.length} ${strings.checklist.completed}`}
        </Text>
      </View>

      {ITEMS.map((item) => {
        const isChecked = !!checked[item.key];
        return (
          <Pressable key={item.key} style={styles.row} onPress={() => toggle(item.key)}>
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.label, isChecked && styles.labelChecked]}>{item.label}</Text>
          </Pressable>
        );
      })}

      <Pressable style={styles.resetBtn} onPress={resetAll}>
        <Text style={styles.resetText}>{strings.checklist.resetAll}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 48 },
  statusBar: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusDone: { backgroundColor: '#e8f5e9' },
  statusPending: { backgroundColor: '#fff3e0' },
  statusText: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  checkboxChecked: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32',
  },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: '700' },
  label: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'right',
    color: '#1a1a1a',
  },
  labelChecked: {
    color: '#888',
    textDecorationLine: 'line-through',
  },
  resetBtn: {
    marginTop: 24,
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resetText: { fontSize: 15, fontWeight: '600', color: '#c62828' },
});
