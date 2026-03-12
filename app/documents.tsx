import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Modal, Alert, Platform, Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { strings } from '../src/constants/strings';
import { loadDocuments, saveDocuments } from '../src/services/storage';
import type { DocEntry, DocCategory } from '../src/services/storage';

const CATEGORIES: { key: DocCategory; label: string; emoji: string }[] = [
  { key: 'flight', label: strings.documents.flight, emoji: '✈️' },
  { key: 'insurance', label: strings.documents.insurance, emoji: '🛡️' },
  { key: 'reservation', label: strings.documents.reservation, emoji: '🏨' },
  { key: 'rental', label: strings.documents.rental, emoji: '🚐' },
  { key: 'id', label: strings.documents.id, emoji: '🪪' },
  { key: 'other', label: strings.documents.other, emoji: '📎' },
];

const CAT_COLORS: Record<DocCategory, { bg: string; border: string; text: string }> = {
  flight: { bg: '#e3f2fd', border: '#90caf9', text: '#1565c0' },
  insurance: { bg: '#e8f5e9', border: '#a5d6a7', text: '#2e7d32' },
  reservation: { bg: '#fff3e0', border: '#ffcc80', text: '#e65100' },
  rental: { bg: '#f3e5f5', border: '#ce93d8', text: '#7b1fa2' },
  id: { bg: '#fce4ec', border: '#f48fb1', text: '#c62828' },
  other: { bg: '#f5f5f5', border: '#bdbdbd', text: '#424242' },
};

function formatSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  return '📁';
}

export default function DocumentsScreen() {
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ uri: string; name: string; mimeType: string; size: number | null } | null>(null);
  const [selectedCat, setSelectedCat] = useState<DocCategory>('flight');
  const [note, setNote] = useState('');
  const [filterCat, setFilterCat] = useState<DocCategory | null>(null);

  useEffect(() => {
    loadDocuments().then(setDocs);
  }, []);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setPendingFile({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
          size: asset.size ?? null,
        });
        setShowAdd(true);
      }
    } catch {}
  }, []);

  const saveDoc = useCallback(() => {
    if (!pendingFile) return;
    const entry: DocEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: pendingFile.name,
      uri: pendingFile.uri,
      mimeType: pendingFile.mimeType,
      size: pendingFile.size,
      category: selectedCat,
      note,
      timestamp: Date.now(),
    };
    const updated = [entry, ...docs];
    setDocs(updated);
    saveDocuments(updated);
    setPendingFile(null);
    setNote('');
    setShowAdd(false);
  }, [pendingFile, selectedCat, note, docs]);

  const deleteDoc = useCallback((id: string) => {
    if (Platform.OS === 'web') {
      const updated = docs.filter((d) => d.id !== id);
      setDocs(updated);
      saveDocuments(updated);
    } else {
      Alert.alert('מחיקה', 'למחוק מסמך זה?', [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => {
            const updated = docs.filter((d) => d.id !== id);
            setDocs(updated);
            saveDocuments(updated);
          },
        },
      ]);
    }
  }, [docs]);

  const openDoc = useCallback(async (uri: string) => {
    try {
      if (Platform.OS === 'web') {
        window.open(uri, '_blank');
      } else {
        await Linking.openURL(uri);
      }
    } catch {}
  }, []);

  const filtered = filterCat ? docs.filter((d) => d.category === filterCat) : docs;

  return (
    <View style={st.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow} style={st.filterScroll}>
        <Pressable
          style={[st.filterPill, !filterCat && st.filterPillActive]}
          onPress={() => setFilterCat(null)}
        >
          <Text style={[st.filterText, !filterCat && st.filterTextActive]}>
            {strings.map.filterAll} ({docs.length})
          </Text>
        </Pressable>
        {CATEGORIES.map((cat) => {
          const count = docs.filter((d) => d.category === cat.key).length;
          return (
            <Pressable
              key={cat.key}
              style={[st.filterPill, filterCat === cat.key && st.filterPillActive]}
              onPress={() => setFilterCat(filterCat === cat.key ? null : cat.key)}
            >
              <Text style={[st.filterText, filterCat === cat.key && st.filterTextActive]}>
                {cat.emoji} {cat.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={st.list} contentContainerStyle={st.listContent}>
        {filtered.length === 0 && (
          <Text style={st.empty}>{strings.documents.noDocs}</Text>
        )}
        {filtered.map((doc) => {
          const colors = CAT_COLORS[doc.category];
          const catInfo = CATEGORIES.find((c) => c.key === doc.category);
          return (
            <View key={doc.id} style={[st.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <View style={st.cardHeader}>
                <Text style={st.cardIcon}>{fileIcon(doc.mimeType)}</Text>
                <View style={st.cardTitleWrap}>
                  <Text style={[st.cardName, { color: colors.text }]} numberOfLines={2}>{doc.name}</Text>
                  <View style={st.cardMeta}>
                    <Text style={st.cardBadge}>
                      {catInfo?.emoji} {catInfo?.label}
                    </Text>
                    {!!doc.size && <Text style={st.cardSize}>{formatSize(doc.size)}</Text>}
                  </View>
                  {!!doc.note && <Text style={st.cardNote}>{doc.note}</Text>}
                </View>
              </View>
              <View style={st.cardActions}>
                <Pressable style={[st.openBtn, { backgroundColor: colors.text }]} onPress={() => openDoc(doc.uri)}>
                  <Text style={st.openBtnText}>{strings.documents.open}</Text>
                </Pressable>
                <Pressable style={st.delBtn} onPress={() => deleteDoc(doc.id)}>
                  <Text style={st.delBtnText}>✕</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={st.actionBar}>
        <Pressable style={st.addBtn} onPress={pickDocument}>
          <Text style={st.addBtnText}>📎 {strings.documents.addDocument}</Text>
        </Pressable>
      </View>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={st.modalBackdrop}>
          <View style={st.modal}>
            <Text style={st.modalTitle}>{strings.documents.addDocument}</Text>

            {pendingFile && (
              <View style={st.filePreview}>
                <Text style={st.fileEmoji}>{fileIcon(pendingFile.mimeType)}</Text>
                <View style={st.fileInfo}>
                  <Text style={st.fileName} numberOfLines={2}>{pendingFile.name}</Text>
                  {!!pendingFile.size && <Text style={st.fileSize}>{formatSize(pendingFile.size)}</Text>}
                </View>
              </View>
            )}

            <Text style={st.fieldLabel}>{strings.documents.category}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catRow}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.key}
                  style={[st.catPill, selectedCat === cat.key && st.catPillActive]}
                  onPress={() => setSelectedCat(cat.key)}
                >
                  <Text style={[st.catText, selectedCat === cat.key && st.catTextActive]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={st.fieldLabel}>{strings.documents.note}</Text>
            <TextInput
              style={st.input}
              value={note}
              onChangeText={setNote}
              placeholder={strings.documents.note}
              textAlign="right"
            />

            <View style={st.modalActions}>
              <Pressable style={st.saveBtn} onPress={saveDoc}>
                <Text style={st.saveBtnText}>{strings.documents.save}</Text>
              </Pressable>
              <Pressable style={st.cancelBtn} onPress={() => { setShowAdd(false); setPendingFile(null); setNote(''); }}>
                <Text style={st.cancelBtnText}>{strings.documents.cancel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  filterScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  filterRow: { flexDirection: 'row-reverse', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0' },
  filterPillActive: { backgroundColor: '#1a1a1a' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#555' },
  filterTextActive: { color: '#fff' },

  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 100 },
  empty: { fontSize: 15, color: '#999', textAlign: 'center', marginTop: 40 },

  card: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row-reverse', gap: 12 },
  cardIcon: { fontSize: 32 },
  cardTitleWrap: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  cardMeta: { flexDirection: 'row-reverse', gap: 8, marginTop: 4, alignItems: 'center' },
  cardBadge: { fontSize: 12, fontWeight: '600', color: '#666' },
  cardSize: { fontSize: 11, color: '#999' },
  cardNote: { fontSize: 13, color: '#555', textAlign: 'right', marginTop: 4 },
  cardActions: { flexDirection: 'row-reverse', gap: 8, marginTop: 12 },
  openBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' as const },
  openBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  delBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#ffebee', alignItems: 'center' as const, justifyContent: 'center' as const },
  delBtnText: { fontSize: 16, color: '#c62828', fontWeight: '700' },

  actionBar: {
    padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#fafafa',
  },
  addBtn: {
    backgroundColor: '#1a1a1a', paddingVertical: 16, borderRadius: 12, alignItems: 'center' as const,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'right', marginBottom: 16, color: '#1a1a1a' },

  filePreview: {
    flexDirection: 'row-reverse', gap: 12, backgroundColor: '#f8f9fa',
    borderRadius: 12, padding: 14, marginBottom: 16, alignItems: 'center',
  },
  fileEmoji: { fontSize: 36 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', textAlign: 'right', color: '#1a1a1a' },
  fileSize: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 2 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#888', textAlign: 'right', marginBottom: 6, marginTop: 10 },
  catRow: { flexDirection: 'row-reverse', gap: 6, paddingBottom: 4 },
  catPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0' },
  catPillActive: { backgroundColor: '#1a1a1a' },
  catText: { fontSize: 13, fontWeight: '600', color: '#555' },
  catTextActive: { color: '#fff' },

  input: {
    backgroundColor: '#f5f5f5', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
    fontSize: 15, color: '#1a1a1a', borderWidth: 1, borderColor: '#e0e0e0',
  },
  modalActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 20 },
  saveBtn: {
    flex: 1, backgroundColor: '#1a1a1a', paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    flex: 1, backgroundColor: '#f5f5f5', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center' as const, borderWidth: 1, borderColor: '#e0e0e0',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: '#555' },
});
