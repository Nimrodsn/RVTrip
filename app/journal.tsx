import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image, TextInput, Modal, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { strings } from '../src/constants/strings';
import { loadPhotos, savePhotos } from '../src/services/storage';
import type { PhotoEntry } from '../src/services/storage';
import itineraryData from '../src/data/itinerary.json';
import type { Itinerary } from '../src/types/itinerary';

const itinerary = itineraryData as Itinerary;
const locationNames = itinerary.locations.map((l) => ({ name: l.name, day: l.day }));

export default function JournalScreen() {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUri, setNewUri] = useState('');
  const [newNote, setNewNote] = useState('');
  const [selectedLoc, setSelectedLoc] = useState(0);

  useEffect(() => {
    loadPhotos().then(setPhotos);
  }, []);

  const pickImage = useCallback(async (useCamera: boolean) => {
    const launcher = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launcher({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setNewUri(result.assets[0].uri);
      setShowAdd(true);
    }
  }, []);

  const savePhoto = useCallback(() => {
    if (!newUri) return;
    const loc = locationNames[selectedLoc];
    const entry: PhotoEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      uri: newUri,
      locationName: loc.name,
      day: loc.day,
      timestamp: Date.now(),
      note: newNote,
    };
    const updated = [entry, ...photos];
    setPhotos(updated);
    savePhotos(updated);
    setNewUri('');
    setNewNote('');
    setShowAdd(false);
  }, [newUri, newNote, selectedLoc, photos]);

  const deletePhoto = useCallback((id: string) => {
    if (Platform.OS === 'web') {
      const updated = photos.filter((p) => p.id !== id);
      setPhotos(updated);
      savePhotos(updated);
    } else {
      Alert.alert('מחיקה', 'למחוק תמונה זו?', [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק', style: 'destructive',
          onPress: () => {
            const updated = photos.filter((p) => p.id !== id);
            setPhotos(updated);
            savePhotos(updated);
          },
        },
      ]);
    }
  }, [photos]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {photos.length === 0 && (
          <Text style={styles.empty}>{strings.journal.noPhotos}</Text>
        )}
        {photos.map((photo) => (
          <View key={photo.id} style={styles.card}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardLoc}>{photo.locationName}</Text>
              <Text style={styles.cardDay}>יום {photo.day}</Text>
              {!!photo.note && <Text style={styles.cardNote}>{photo.note}</Text>}
            </View>
            <Pressable style={styles.deleteBtn} onPress={() => deletePhoto(photo.id)}>
              <Text style={styles.deleteText}>✕</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <View style={styles.actionBar}>
        <Pressable style={styles.cameraBtn} onPress={() => pickImage(true)}>
          <Text style={styles.actionText}>📷 {strings.journal.takePhoto}</Text>
        </Pressable>
        <Pressable style={styles.galleryBtn} onPress={() => pickImage(false)}>
          <Text style={styles.actionText}>🖼️ {strings.journal.pickPhoto}</Text>
        </Pressable>
      </View>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            {!!newUri && <Image source={{ uri: newUri }} style={styles.preview} />}

            <Text style={styles.fieldLabel}>מיקום</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locRow}>
              {locationNames.map((loc, i) => (
                <Pressable
                  key={`${loc.day}-${loc.name}`}
                  style={[styles.locPill, selectedLoc === i && styles.locPillActive]}
                  onPress={() => setSelectedLoc(i)}
                >
                  <Text style={[styles.locText, selectedLoc === i && styles.locTextActive]} numberOfLines={1}>
                    {loc.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{strings.journal.addNote}</Text>
            <TextInput
              style={styles.input}
              value={newNote}
              onChangeText={setNewNote}
              placeholder={strings.journal.addNote}
              textAlign="right"
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={savePhoto}>
                <Text style={styles.saveBtnText}>{strings.journal.save}</Text>
              </Pressable>
              <Pressable style={styles.cancelBtn} onPress={() => { setShowAdd(false); setNewUri(''); }}>
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
  listContent: { padding: 16, paddingBottom: 100 },
  empty: { fontSize: 15, color: '#999', textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row-reverse', backgroundColor: '#f8f9fa', borderRadius: 14,
    overflow: 'hidden', marginBottom: 12,
  },
  photo: { width: 90, height: 90 },
  cardInfo: { flex: 1, padding: 12 },
  cardLoc: { fontSize: 15, fontWeight: '700', textAlign: 'right', color: '#1a1a1a' },
  cardDay: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 2 },
  cardNote: { fontSize: 13, color: '#555', textAlign: 'right', marginTop: 4 },
  deleteBtn: { padding: 12, justifyContent: 'center' },
  deleteText: { fontSize: 16, color: '#c62828', fontWeight: '700' },
  actionBar: {
    flexDirection: 'row-reverse', gap: 10, padding: 16, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#fafafa',
  },
  cameraBtn: {
    flex: 1, backgroundColor: '#1a1a1a', paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  galleryBtn: {
    flex: 1, backgroundColor: '#37474f', paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  preview: { width: '100%', height: 180, borderRadius: 12, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#888', textAlign: 'right', marginBottom: 6, marginTop: 10 },
  locRow: { flexDirection: 'row-reverse', gap: 6, paddingBottom: 4 },
  locPill: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0', maxWidth: 160,
  },
  locPillActive: { backgroundColor: '#1a1a1a' },
  locText: { fontSize: 12, fontWeight: '600', color: '#555' },
  locTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
    fontSize: 15, color: '#1a1a1a', borderWidth: 1, borderColor: '#e0e0e0',
  },
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
