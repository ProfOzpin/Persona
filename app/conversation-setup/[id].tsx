import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { getDatabase } from '@/lib/database';

type FlowMode = 'full_control' | 'random';

export default function ConversationSetupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<FlowMode | null>(null);

  const handleContinue = async () => {
    if (!selectedMode) return;

    try {
      const db = getDatabase();
      
      // Update conversation with flow mode
      await db.runAsync(
        'UPDATE conversations SET flow_mode = ? WHERE id = ?',
        selectedMode,
        id
      );

      // If random mode, generate initial sequence
      if (selectedMode === 'random') {
        const personas = await db.getAllAsync<{ persona_id: string }>(
          'SELECT persona_id FROM conversation_personas WHERE conversation_id = ?',
          id
        );

        // Shuffle personas
        const personaIds = personas.map(p => p.persona_id);
        const shuffled = personaIds.sort(() => Math.random() - 0.5);

        await db.runAsync(
          'UPDATE conversations SET persona_sequence = ?, current_persona_index = 0 WHERE id = ?',
          JSON.stringify(shuffled),
          id
        );

        console.log('✓ Generated random sequence:', shuffled);
      }

      console.log(`✓ Set flow mode to ${selectedMode}`);
      
      // Navigate to conversation
      router.replace(`/conversation/${id}`);
    } catch (error) {
      console.error('Failed to set flow mode:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Choose Conversation Flow</Text>
        <Text style={styles.subtitle}>
          How would you like to control who speaks?
        </Text>

        {/* Full Control Option */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedMode === 'full_control' && styles.optionCardSelected
          ]}
          onPress={() => setSelectedMode('full_control')}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionTitle}>Full Control</Text>
            {selectedMode === 'full_control' && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.optionDescription}>
            You manually choose which persona speaks at any time. Perfect for deliberate, structured conversations.
          </Text>
        </TouchableOpacity>

        {/* Random Option */}
        <TouchableOpacity
          style={[
            styles.optionCard,
            selectedMode === 'random' && styles.optionCardSelected
          ]}
          onPress={() => setSelectedMode('random')}
        >
          <View style={styles.optionHeader}>
            <Text style={styles.optionTitle}>Random Sequence</Text>
            {selectedMode === 'random' && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.optionDescription}>
            Personas speak in a random order. Each persona gets one turn, then the sequence reshuffles. Great for natural flow.
          </Text>
        </TouchableOpacity>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !selectedMode && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selectedMode}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#231f20',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#aaaaaa',
    fontSize: 16,
    marginBottom: 40,
  },
  optionCard: {
    backgroundColor: '#2a2626',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: 'white',
    backgroundColor: '#3a3636',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: '#231f20',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionDescription: {
    color: '#cccccc',
    fontSize: 14,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  continueButtonDisabled: {
    backgroundColor: '#3a3636',
  },
  continueButtonText: {
    color: '#231f20',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
