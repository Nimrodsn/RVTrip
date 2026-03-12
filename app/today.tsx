import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Linking,
  TextInput, Modal, Alert, Platform,
} from 'react-native';
import { strings } from '../src/constants/strings';
import {
  loadDayNotes, saveDayNotes, loadStopEdits, saveStopEdits,
  loadHiddenStops, saveHiddenStops,
} from '../src/services/storage';
import type { DayNote } from '../src/services/storage';
import itineraryData from '../src/data/itinerary.json';
import type { Itinerary, LocationType, ItineraryLocation } from '../src/types/itinerary';

const itinerary = itineraryData as Itinerary;
const allDays = Array.from(new Set(itinerary.locations.map((l) => l.day))).sort((a, b) => a - b);

const TYPE_COLORS: Record<LocationType, { bg: string; accent: string }> = {
  campsite: { bg: '#e8f5e9', accent: '#2e7d32' },
  attraction: { bg: '#ffebee', accent: '#c62828' },
  supply: { bg: '#e3f2fd', accent: '#1565c0' },
};

const TYPE_EMOJI: Record<LocationType, string> = {
  campsite: '⛺', attraction: '🎯', supply: '🛒',
};

type TimelineItem =
  | { kind: 'stop'; loc: ItineraryLocation; index: number }
  | { kind: 'note'; note: DayNote };

function stopKey(loc: ItineraryLocation): string {
  return `${loc.day}::${loc.name}`;
}

export default function TodayScreen() {
  const [selectedDay, setSelectedDay] = useState(allDays[0]);
  const [editing, setEditing] = useState(false);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [stopEdits, setStopEdits] = useState<Record<string, string>>({});
  const [hiddenStops, setHiddenStops] = useState<string[]>([]);

  const [showAddNote, setShowAddNote] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [newText, setNewText] = useState('');

  const [editingStopKey, setEditingStopKey] = useState<string | null>(null);
  const [editingStopNote, setEditingStopNote] = useState('');

  useEffect(() => {
    loadDayNotes().then(setDayNotes);
    loadStopEdits().then(setStopEdits);
    loadHiddenStops().then(setHiddenStops);
  }, []);

  const hiddenSet = new Set(hiddenStops);
  const allDayStops = itinerary.locations.filter((l) => l.day === selectedDay);
  const dayStops = allDayStops.filter((l) => !hiddenSet.has(stopKey(l)));
  const dayHiddenStops = allDayStops.filter((l) => hiddenSet.has(stopKey(l)));
  const dayCustomNotes = dayNotes
    .filter((n) => n.day === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const timeline: TimelineItem[] = [];
  let noteIdx = 0;
  for (let i = 0; i < dayStops.length; i++) {
    while (noteIdx < dayCustomNotes.length && dayCustomNotes[noteIdx].time <= String(i).padStart(2, '0')) {
      timeline.push({ kind: 'note', note: dayCustomNotes[noteIdx] });
      noteIdx++;
    }
    timeline.push({ kind: 'stop', loc: dayStops[i], index: i });
  }
  while (noteIdx < dayCustomNotes.length) {
    timeline.push({ kind: 'note', note: dayCustomNotes[noteIdx] });
    noteIdx++;
  }

  const addNote = useCallback(() => {
    if (!newText.trim()) return;
    const entry: DayNote = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      day: selectedDay,
      time: newTime || '99:99',
      text: newText.trim(),
      done: false,
    };
    const updated = [...dayNotes, entry];
    setDayNotes(updated);
    saveDayNotes(updated);
    setNewTime('');
    setNewText('');
    setShowAddNote(false);
  }, [newText, newTime, selectedDay, dayNotes]);

  const toggleNoteDone = useCallback((id: string) => {
    const updated = dayNotes.map((n) => n.id === id ? { ...n, done: !n.done } : n);
    setDayNotes(updated);
    saveDayNotes(updated);
  }, [dayNotes]);

  const deleteNote = useCallback((id: string) => {
    const doDelete = () => {
      const updated = dayNotes.filter((n) => n.id !== id);
      setDayNotes(updated);
      saveDayNotes(updated);
    };
    if (Platform.OS === 'web') {
      doDelete();
    } else {
      Alert.alert('מחיקה', 'למחוק פריט זה?', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק', style: 'destructive', onPress: doDelete },
      ]);
    }
  }, [dayNotes]);

  const saveStopNote = useCallback((key: string, note: string) => {
    const updated = { ...stopEdits, [key]: note };
    setStopEdits(updated);
    saveStopEdits(updated);
    setEditingStopKey(null);
    setEditingStopNote('');
  }, [stopEdits]);

  const hideStop = useCallback((key: string) => {
    const doHide = () => {
      const updated = [...hiddenStops, key];
      setHiddenStops(updated);
      saveHiddenStops(updated);
    };
    if (Platform.OS === 'web') {
      doHide();
    } else {
      Alert.alert('הסרה', 'להסיר תחנה זו מהתוכנית?', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'הסר', style: 'destructive', onPress: doHide },
      ]);
    }
  }, [hiddenStops]);

  const restoreStop = useCallback((key: string) => {
    const updated = hiddenStops.filter((k) => k !== key);
    setHiddenStops(updated);
    saveHiddenStops(updated);
  }, [hiddenStops]);

  const restoreAllForDay = useCallback(() => {
    const keysToRestore = dayHiddenStops.map((l) => stopKey(l));
    const updated = hiddenStops.filter((k) => !keysToRestore.includes(k));
    setHiddenStops(updated);
    saveHiddenStops(updated);
  }, [hiddenStops, dayHiddenStops]);

  const getStopNote = (loc: ItineraryLocation): string => {
    const key = stopKey(loc);
    return key in stopEdits ? stopEdits[key] : loc.note;
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.sectionLabel}>{strings.today.selectDay}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
          {allDays.map((day) => (
            <Pressable
              key={day}
              style={[styles.dayPill, selectedDay === day && styles.dayPillActive]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayPillText, selectedDay === day && styles.dayPillTextActive]}>
                {day}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>יום {selectedDay}</Text>
          <Pressable
            style={editing ? styles.editBtnActive : styles.editBtn}
            onPress={() => setEditing((e) => !e)}
          >
            <Text style={editing ? styles.editBtnTextActive : styles.editBtnText}>
              {editing ? `✓ ${strings.today.donEditing}` : `✏️ ${strings.today.editPlan}`}
            </Text>
          </Pressable>
        </View>

        {timeline.length === 0 && (
          <Text style={styles.empty}>{strings.today.noStops}</Text>
        )}

        {timeline.map((item, idx) => {
          const isLast = idx === timeline.length - 1;

          if (item.kind === 'note') {
            const n = item.note;
            return (
              <View key={n.id} style={styles.stopWrapper}>
                <View style={styles.timeline}>
                  <View style={[styles.dot, { backgroundColor: '#ff9800' }]} />
                  {!isLast && <View style={styles.line} />}
                </View>
                <Pressable
                  style={[styles.card, styles.noteCard, n.done && styles.noteCardDone]}
                  onPress={() => toggleNoteDone(n.id)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.stopNumber}>
                      {n.time !== '99:99' ? `🕐 ${n.time}` : `📌 ${strings.today.customItem}`}
                    </Text>
                    <Text style={styles.emoji}>{n.done ? '✅' : '📝'}</Text>
                  </View>
                  <Text style={[styles.noteName, n.done && styles.noteNameDone]}>{n.text}</Text>
                  {editing && (
                    <Pressable style={styles.deleteItemBtn} onPress={() => deleteNote(n.id)}>
                      <Text style={styles.deleteItemText}>✕ {strings.today.deleteItem}</Text>
                    </Pressable>
                  )}
                </Pressable>
              </View>
            );
          }

          const { loc, index } = item;
          const colors = TYPE_COLORS[loc.type];
          const note = getStopNote(loc);

          return (
            <View key={stopKey(loc)} style={styles.stopWrapper}>
              <View style={styles.timeline}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                {!isLast && <View style={styles.line} />}
              </View>
              <View style={[styles.card, { backgroundColor: colors.bg }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.stopNumber}>
                    {strings.today.stopOf} {index + 1}/{dayStops.length}
                  </Text>
                  <Text style={styles.emoji}>{TYPE_EMOJI[loc.type]}</Text>
                </View>
                <Text style={styles.name}>{loc.name}</Text>
                <Text style={styles.note}>{note}</Text>
                {editing && (
                  <View style={styles.editActions}>
                    <Pressable
                      style={styles.editNoteBtn}
                      onPress={() => {
                        setEditingStopKey(stopKey(loc));
                        setEditingStopNote(note);
                      }}
                    >
                      <Text style={styles.editNoteText}>✏️ {strings.today.editNote}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteStopBtn}
                      onPress={() => hideStop(stopKey(loc))}
                    >
                      <Text style={styles.deleteStopText}>✕ {strings.today.deleteStop}</Text>
                    </Pressable>
                  </View>
                )}
                <Pressable
                  style={[styles.navBtn, { backgroundColor: colors.accent }]}
                  onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${loc.coords.lat},${loc.coords.lng}`)}
                >
                  <Text style={styles.navBtnText}>{strings.today.navigateNow}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {editing && dayHiddenStops.length > 0 && (
          <View style={styles.hiddenSection}>
            <View style={styles.hiddenHeader}>
              <Text style={styles.hiddenTitle}>
                {strings.today.hiddenCount} ({dayHiddenStops.length})
              </Text>
              <Pressable style={styles.restoreAllBtn} onPress={restoreAllForDay}>
                <Text style={styles.restoreAllText}>{strings.today.restoreStops}</Text>
              </Pressable>
            </View>
            {dayHiddenStops.map((loc) => {
              const colors = TYPE_COLORS[loc.type];
              return (
                <View key={stopKey(loc)} style={styles.hiddenCard}>
                  <Text style={styles.hiddenEmoji}>{TYPE_EMOJI[loc.type]}</Text>
                  <Text style={styles.hiddenName} numberOfLines={1}>{loc.name}</Text>
                  <Pressable
                    style={[styles.restoreBtn, { backgroundColor: colors.accent }]}
                    onPress={() => restoreStop(stopKey(loc))}
                  >
                    <Text style={styles.restoreBtnText}>↩</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {editing && (
        <View style={styles.actionBar}>
          <Pressable style={styles.addBtn} onPress={() => setShowAddNote(true)}>
            <Text style={styles.addBtnText}>＋ {strings.today.addItem}</Text>
          </Pressable>
        </View>
      )}

      {/* Add custom note modal */}
      <Modal visible={showAddNote} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{strings.today.addItem}</Text>

            <Text style={styles.fieldLabel}>{strings.today.time}</Text>
            <TextInput
              style={styles.input}
              value={newTime}
              onChangeText={setNewTime}
              placeholder="08:30"
              textAlign="right"
              keyboardType="default"
            />

            <Text style={styles.fieldLabel}>{strings.today.activity}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={newText}
              onChangeText={setNewText}
              placeholder={strings.today.activity}
              textAlign="right"
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={addNote}>
                <Text style={styles.saveBtnText}>{strings.today.save}</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => { setShowAddNote(false); setNewTime(''); setNewText(''); }}>
                <Text style={styles.cancelBtnText}>{strings.today.cancel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit stop note modal */}
      <Modal visible={editingStopKey !== null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{strings.today.editNote}</Text>

            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={editingStopNote}
              onChangeText={setEditingStopNote}
              textAlign="right"
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={() => editingStopKey && saveStopNote(editingStopKey, editingStopNote)}>
                <Text style={styles.saveBtnText}>{strings.today.save}</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => { setEditingStopKey(null); setEditingStopNote(''); }}>
                <Text style={styles.cancelBtnText}>{strings.today.cancel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 100 },
  sectionLabel: {
    fontSize: 14, fontWeight: '600', color: '#888', textAlign: 'right', marginBottom: 10,
  },
  dayRow: {
    flexDirection: 'row-reverse', gap: 8, paddingBottom: 16,
  },
  dayPill: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center',
  },
  dayPillActive: { backgroundColor: '#1a1a1a' },
  dayPillText: { fontSize: 16, fontWeight: '700', color: '#555' },
  dayPillTextActive: { color: '#fff' },

  dayHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  dayTitle: {
    fontSize: 22, fontWeight: '800', textAlign: 'right', color: '#1a1a1a',
  },
  editBtn: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e0e0e0',
  },
  editBtnActive: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: '#1a1a1a',
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: '#555' },
  editBtnTextActive: { fontSize: 13, fontWeight: '700', color: '#fff' },

  empty: { fontSize: 15, color: '#999', textAlign: 'right' },

  stopWrapper: {
    flexDirection: 'row-reverse', marginBottom: 4,
  },
  timeline: {
    width: 32, alignItems: 'center', paddingTop: 18,
  },
  dot: {
    width: 14, height: 14, borderRadius: 7, zIndex: 1,
  },
  line: {
    width: 2, flex: 1, backgroundColor: '#ddd', marginTop: -2,
  },
  card: {
    flex: 1, borderRadius: 14, padding: 16, marginBottom: 8,
  },
  noteCard: {
    backgroundColor: '#fff8e1', borderWidth: 1, borderColor: '#ffe082',
  },
  noteCardDone: {
    backgroundColor: '#f5f5f5', borderColor: '#e0e0e0', opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  stopNumber: { fontSize: 12, fontWeight: '600', color: '#888' },
  emoji: { fontSize: 20 },
  name: { fontSize: 18, fontWeight: '700', textAlign: 'right', marginBottom: 4, color: '#1a1a1a' },
  note: { fontSize: 14, color: '#555', textAlign: 'right', marginBottom: 12 },
  noteName: { fontSize: 16, fontWeight: '600', textAlign: 'right', color: '#1a1a1a', marginBottom: 4 },
  noteNameDone: { textDecorationLine: 'line-through', color: '#999' },

  editActions: {
    flexDirection: 'row-reverse', gap: 8, marginBottom: 8, flexWrap: 'wrap',
  },
  editNoteBtn: {
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.06)',
  },
  editNoteText: { fontSize: 12, fontWeight: '600', color: '#555' },
  deleteStopBtn: {
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, backgroundColor: '#ffebee',
  },
  deleteStopText: { fontSize: 12, fontWeight: '600', color: '#c62828' },

  hiddenSection: {
    marginTop: 20, padding: 16, backgroundColor: '#fafafa',
    borderRadius: 14, borderWidth: 1, borderColor: '#e0e0e0',
  },
  hiddenHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  hiddenTitle: { fontSize: 14, fontWeight: '700', color: '#888' },
  restoreAllBtn: {
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  restoreAllText: { fontSize: 12, fontWeight: '700', color: '#1565c0' },
  hiddenCard: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  hiddenEmoji: { fontSize: 18 },
  hiddenName: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right', color: '#999' },
  restoreBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  restoreBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  deleteItemBtn: {
    alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, backgroundColor: '#ffebee', marginTop: 4,
  },
  deleteItemText: { fontSize: 12, fontWeight: '600', color: '#c62828' },

  navBtn: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignSelf: 'flex-end',
  },
  navBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  actionBar: {
    padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#fafafa',
  },
  addBtn: {
    backgroundColor: '#ff9800', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center' as const,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'right', marginBottom: 16, color: '#1a1a1a' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#888', textAlign: 'right', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
    fontSize: 15, color: '#1a1a1a', borderWidth: 1, borderColor: '#e0e0e0',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 20 },
  saveBtn: {
    flex: 1, backgroundColor: '#1a1a1a', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center' as const,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    flex: 1, backgroundColor: '#f5f5f5', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center' as const, borderWidth: 1, borderColor: '#e0e0e0',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: '#555' },
});
