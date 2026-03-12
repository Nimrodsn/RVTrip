import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal } from 'react-native';
import { strings } from '../src/constants/strings';
import { loadExpenses, saveExpenses } from '../src/services/storage';
import type { Expense } from '../src/services/storage';

const CATEGORIES: { key: Expense['category']; label: string; emoji: string }[] = [
  { key: 'fuel', label: strings.budget.fuel, emoji: '⛽' },
  { key: 'camping', label: strings.budget.camping, emoji: '⛺' },
  { key: 'food', label: strings.budget.food, emoji: '🍕' },
  { key: 'supplies', label: strings.budget.supplies, emoji: '🛒' },
  { key: 'activity', label: strings.budget.activity, emoji: '🎢' },
  { key: 'other', label: strings.budget.other, emoji: '📦' },
];

const CURRENCIES: Expense['currency'][] = ['CZK', 'EUR'];

export default function BudgetScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Expense['currency']>('CZK');
  const [category, setCategory] = useState<Expense['category']>('fuel');
  const [note, setNote] = useState('');
  const [day, setDay] = useState('1');

  useEffect(() => {
    loadExpenses().then(setExpenses);
  }, []);

  const addExpense = useCallback(() => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    const newExp: Expense = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      amount: num,
      currency,
      category,
      note,
      day: parseInt(day) || 1,
      timestamp: Date.now(),
    };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    saveExpenses(updated);
    setAmount('');
    setNote('');
    setShowAdd(false);
  }, [amount, currency, category, note, day, expenses]);

  const deleteExpense = useCallback((id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    saveExpenses(updated);
  }, [expenses]);

  const totalCZK = expenses.filter((e) => e.currency === 'CZK').reduce((s, e) => s + e.amount, 0);
  const totalEUR = expenses.filter((e) => e.currency === 'EUR').reduce((s, e) => s + e.amount, 0);

  const catEmoji = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.emoji]));
  const catLabel = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <View style={styles.totals}>
          {totalCZK > 0 && <Text style={styles.totalText}>{totalCZK.toLocaleString()} CZK</Text>}
          {totalEUR > 0 && <Text style={styles.totalText}>{totalEUR.toLocaleString()} EUR</Text>}
          {totalCZK === 0 && totalEUR === 0 && (
            <Text style={styles.empty}>{strings.budget.noExpenses}</Text>
          )}
        </View>

        {expenses.map((exp) => (
          <View key={exp.id} style={styles.row}>
            <Text style={styles.rowEmoji}>{catEmoji[exp.category]}</Text>
            <View style={styles.rowInfo}>
              <Text style={styles.rowAmount}>{exp.amount} {exp.currency}</Text>
              <Text style={styles.rowMeta}>
                {catLabel[exp.category]} · יום {exp.day}{exp.note ? ` · ${exp.note}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => deleteExpense(exp.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
        <Text style={styles.addBtnText}>+ {strings.budget.addExpense}</Text>
      </Pressable>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{strings.budget.addExpense}</Text>

            <Text style={styles.fieldLabel}>{strings.budget.amount}</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              textAlign="right"
            />

            <Text style={styles.fieldLabel}>מטבע</Text>
            <View style={styles.pillRow}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.pill, currency === c && styles.pillActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.pillText, currency === c && styles.pillTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>קטגוריה</Text>
            <View style={styles.pillRow}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.key}
                  style={[styles.pill, category === c.key && styles.pillActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={[styles.pillText, category === c.key && styles.pillTextActive]}>
                    {c.emoji} {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{strings.budget.day}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={day}
              onChangeText={setDay}
              textAlign="right"
            />

            <Text style={styles.fieldLabel}>{strings.budget.note}</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder={strings.budget.note}
              textAlign="right"
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={addExpense}>
                <Text style={styles.saveBtnText}>{strings.budget.addExpense}</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 80 },
  totals: {
    backgroundColor: '#f8f9fa', borderRadius: 14, padding: 20, marginBottom: 20,
    alignItems: 'center', gap: 4,
  },
  totalText: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  empty: { fontSize: 15, color: '#999' },
  row: {
    flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12,
  },
  rowEmoji: { fontSize: 24 },
  rowInfo: { flex: 1 },
  rowAmount: { fontSize: 17, fontWeight: '700', textAlign: 'right', color: '#1a1a1a' },
  rowMeta: { fontSize: 13, color: '#888', textAlign: 'right', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteText: { fontSize: 16, color: '#c62828', fontWeight: '700' },
  addBtn: {
    position: 'absolute', bottom: 24, left: 20, right: 20,
    backgroundColor: '#1a1a1a', paddingVertical: 16, borderRadius: 14, alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'right', marginBottom: 16, color: '#1a1a1a' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#888', textAlign: 'right', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
    fontSize: 16, color: '#1a1a1a', borderWidth: 1, borderColor: '#e0e0e0',
  },
  pillRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0',
  },
  pillActive: { backgroundColor: '#1a1a1a' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#555' },
  pillTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 20 },
  saveBtn: {
    flex: 1, backgroundColor: '#1a1a1a', paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    flex: 1, backgroundColor: '#f5f5f5', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: '#555' },
});
