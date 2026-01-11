import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { getDatabase } from '@/lib/database';

const PRESET_COLORS = [
  '#2196F3', '#E91E63', '#4CAF50', '#FF5722', '#9C27B0',
  '#00BCD4', '#FFC107', '#795548', '#607D8B', '#FF9800',
  '#F44336', '#3F51B5', '#009688', '#CDDC39', '#FF6F00',
];

export default function CreatePersonaScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [perspective, setPerspective] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleSave = async () => {
    if (!name.trim() || !perspective.trim()) {
      alert('Please fill in both name and perspective');
      return;
    }

    try {
      const db = getDatabase();
      const personaId = `persona_custom_${Date.now()}`;
      const now = Date.now();

      await db.runAsync(
        `INSERT INTO personas (id, name, description, color, is_custom, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
        personaId,
        name.trim(),
        perspective.trim(),
        selectedColor,
        now,
        now
      );

      console.log('✓ Custom persona created:', personaId);
      
      // Navigate back with the new persona ID to auto-select it
      router.back();
      // TODO: Pass personaId back to new-conversation screen
      
    } catch (error) {
      console.error('Failed to create persona:', error);
      alert('Failed to create persona. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create Your Persona</Text>
      
      {/* Name Input */}
      <Text style={styles.label}>Persona Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., The Adventurer"
        placeholderTextColor="#666666"
        value={name}
        onChangeText={setName}
      />

      {/* Perspective Input */}
      <Text style={styles.label}>Perspective (First Person)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="e.g., I embrace challenges and see every obstacle as an opportunity..."
        placeholderTextColor="#666666"
        value={perspective}
        onChangeText={setPerspective}
        multiline
        numberOfLines={4}
      />

      {/* Color Selection */}
      <Text style={styles.label}>Choose Color</Text>
      <View style={styles.colorGrid}>
        {PRESET_COLORS.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorCircle,
              { backgroundColor: color },
              selectedColor === color && styles.colorCircleSelected,
            ]}
            onPress={() => setSelectedColor(color)}
          />
        ))}
      </View>

      {/* Preview */}
      <View style={styles.previewContainer}>
        <Text style={styles.previewLabel}>Preview</Text>
        <View style={styles.previewContent}>
          <View style={[styles.previewCircle, { backgroundColor: selectedColor }]} />
          <View style={styles.previewTextContainer}>
            <Text style={styles.previewName}>{name || 'Persona Name'}</Text>
            <Text style={styles.previewPerspective}>
              {perspective || 'Your perspective will appear here...'}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Persona</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#231f20',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    color: 'white',
    fontSize: 16,
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#2a2626',
    color: 'white',
    fontSize: 16,
    padding: 15,
    borderRadius: 10,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  colorCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: 'white',
  },
  previewContainer: {
    backgroundColor: '#2a2626',
    borderRadius: 10,
    padding: 15,
    marginTop: 30,
  },
  previewLabel: {
    color: '#aaaaaa',
    fontSize: 14,
    marginBottom: 10,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  previewTextContainer: {
    flex: 1,
  },
  previewName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  previewPerspective: {
    color: '#cccccc',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 30,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#3a3636',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#231f20',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
