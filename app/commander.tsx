import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { strings } from '../src/constants/strings';
import itineraryData from '../src/data/itinerary.json';
import type { Itinerary } from '../src/types/itinerary';

const itinerary = itineraryData as Itinerary;
const currencyStop = itinerary.locations.find((loc) => loc.currencyAlert);

export default function CommanderScreen() {
  const [message, setMessage] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings.commander.title}</Text>

      <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        <Text style={styles.tipsHeader}>{strings.commander.tripTips}</Text>

        {currencyStop && (
          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertEmoji}>💱</Text>
              <Text style={styles.alertTitle}>{strings.commander.currencyAlertTitle}</Text>
            </View>
            <Text style={styles.alertStopName}>{currencyStop.name} · יום {currencyStop.day}</Text>
            <Text style={styles.alertText}>{strings.commander.currencyAlertText}</Text>
          </View>
        )}

        <View style={styles.placeholderBubble}>
          <Text style={styles.placeholderText}>
            שלום! אני המפקד, מומחה קרוואנים עם 15 שנות ניסיון. שאלו אותי כל שאלה על הטיול, החנייה, או המסלול.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.inputRow}>
        <Pressable style={styles.sendBtn}>
          <Text style={styles.sendBtnText}>{strings.commander.send}</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder={strings.commander.placeholder}
          placeholderTextColor="#999"
          value={message}
          onChangeText={setMessage}
          textAlign="right"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'right',
    padding: 20,
    paddingBottom: 12,
    color: '#1a1a1a',
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  tipsHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textAlign: 'right',
    marginBottom: 12,
  },

  alertCard: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffecb3',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  alertHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  alertEmoji: {
    fontSize: 22,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e65100',
  },
  alertStopName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#795548',
    textAlign: 'right',
    marginBottom: 8,
  },
  alertText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4e342e',
    textAlign: 'right',
  },

  placeholderBubble: {
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    padding: 16,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  placeholderText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    textAlign: 'right',
  },

  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fafafa',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1a1a1a',
  },
  sendBtn: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
