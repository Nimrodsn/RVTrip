import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { fetchMeltdownPlaces, MeltdownPlace } from '../services/meltdownPlaces';
import { strings } from '../constants/strings';

function streetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?layer=c&cbll=${lat},${lng}`;
}

function mapsNavUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function EmergencyMeltdown() {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    playground?: MeltdownPlace;
    ice_cream?: MeltdownPlace;
    lake?: MeltdownPlace;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPress = async () => {
    setModalVisible(true);
    setLoading(true);
    setResults(null);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('נדרש אישור גישה למיקום');
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      const data = await fetchMeltdownPlaces(latitude, longitude);
      setResults(data);
    } catch (e) {
      setError('שגיאה בחיפוש');
    } finally {
      setLoading(false);
    }
  };

  const renderPlace = (label: string, place?: MeltdownPlace) => {
    if (!place) return null;
    return (
      <View key={place.placeId} style={styles.placeCard}>
        <Text style={styles.placeLabel}>{label}</Text>
        <Text style={styles.placeName}>{place.name}</Text>
        {place.vicinity ? (
          <Text style={styles.placeVicinity}>{place.vicinity}</Text>
        ) : null}
        {place.distanceKm != null && (
          <Text style={styles.placeDistance}>~{place.distanceKm.toFixed(1)} km</Text>
        )}
        <View style={styles.placeActions}>
          <Pressable
            style={styles.navButton}
            onPress={() => Linking.openURL(mapsNavUrl(place.lat, place.lng))}
          >
            <Text style={styles.navButtonText}>{strings.map.navigate}</Text>
          </Pressable>
          <Pressable
            style={styles.streetViewBtn}
            onPress={() => Linking.openURL(streetViewUrl(place.lat, place.lng))}
          >
            <Text style={styles.streetViewBtnText}>{strings.map.viewEntrance}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <>
      <Pressable
        style={styles.meltdownButton}
        onPress={onPress}
        accessibilityLabel={strings.meltdown.button}
      >
        <Text style={styles.meltdownButtonText}>{strings.meltdown.button}</Text>
      </Pressable>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{strings.meltdown.button}</Text>
            {loading && (
              <View style={styles.loading}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>{strings.meltdown.finding}</Text>
              </View>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
            {!loading && results && (
              <ScrollView style={styles.results}>
                {renderPlace(strings.meltdown.playground, results.playground)}
                {renderPlace(strings.meltdown.iceCream, results.ice_cream)}
                {renderPlace(strings.meltdown.lake, results.lake)}
                {!results.playground && !results.ice_cream && !results.lake && (
                  <Text style={styles.noResults}>{strings.meltdown.noResults}</Text>
                )}
              </ScrollView>
            )}
            <Pressable
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>סגור</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  meltdownButton: {
    backgroundColor: '#c62828',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 280,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  meltdownButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'right',
  },
  loading: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
    textAlign: 'right',
    padding: 16,
  },
  results: {
    maxHeight: 360,
  },
  placeCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  placeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'right',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'right',
  },
  placeVicinity: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    textAlign: 'right',
  },
  placeDistance: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
    textAlign: 'right',
  },
  placeActions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  navButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  streetViewBtn: {
    backgroundColor: '#37474f',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  streetViewBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noResults: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
    padding: 24,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
