import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import personaPacks from '@/assets/data/persona-packs.json';
import { getDatabase } from '@/lib/database';

interface CustomPersona {
  id: string;
  name: string;
  description: string;
  color: string;
}

export default function NewConversationScreen() {
  const router = useRouter();
  const [conversationName, setConversationName] = useState('');
  const [selectedPersonas, setSelectedPersonas] = useState<Set<string>>(new Set(['user'])); // Auto-select "You"
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);

  // Load custom personas from database
  const loadCustomPersonas = useCallback(async () => {
    try {
      const db = getDatabase();
      const personas = await db.getAllAsync<CustomPersona>(
        'SELECT id, name, description, color FROM personas WHERE is_custom = 1 ORDER BY created_at DESC'
      );
      setCustomPersonas(personas);
      console.log(`✓ Loaded ${personas.length} custom personas`);
    } catch (error) {
      console.error('Failed to load custom personas:', error);
    }
  }, []);

  // Reload custom personas when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCustomPersonas();
    }, [loadCustomPersonas])
  );

  const togglePersona = (personaId: string) => {
    // "You" cannot be deselected
    if (personaId === 'user') return;
    
    const newSelected = new Set(selectedPersonas);
    if (newSelected.has(personaId)) {
      newSelected.delete(personaId);
    } else {
      newSelected.add(personaId);
    }
    setSelectedPersonas(newSelected);
  };

  const ensureBuiltInPersonasExist = async (db: any, selectedIds: string[]) => {
    const allBuiltInPersonas = personaPacks.packs.flatMap(pack => 
      pack.personas.map(p => ({
        id: p.id,
        name: p.name,
        description: p.perspective,
        color: p.color,
        pack_name: pack.name
      }))
    );

    const selectedBuiltIn = allBuiltInPersonas.filter(p => selectedIds.includes(p.id));

    for (const persona of selectedBuiltIn) {
      const existing = await db.getFirstAsync(
        'SELECT id FROM personas WHERE id = ?',
        persona.id
      );

      if (!existing) {
        const now = Date.now();
        await db.runAsync(
          `INSERT INTO personas (id, name, description, color, is_custom, pack_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
          persona.id,
          persona.name,
          persona.description,
          persona.color,
          persona.pack_name,
          now,
          now
        );
        console.log(`✓ Added built-in persona to DB: ${persona.name}`);
      }
    }
  };

  const handleDone = async () => {
    if (!conversationName.trim()) {
      Alert.alert('No Title', 'Please give your conversation a title.');
      return;
    }

    try {
      const db = getDatabase();
      const conversationId = `conv_${Date.now()}`;
      const now = Date.now();
      const selectedIds = Array.from(selectedPersonas);

      // Ensure built-in personas exist in DB (with is_custom=0)
      await ensureBuiltInPersonasExist(db, selectedIds);

      // Create conversation
      await db.runAsync(
        `INSERT INTO conversations (id, title, created_at, updated_at, last_message_at)
        VALUES (?, ?, ?, ?, NULL)`,
        conversationId,
        conversationName.trim(),
        now,
        now
      );

      console.log(`✓ Created conversation: ${conversationId}`);

      // Link selected personas to conversation with appropriate side
      for (const personaId of selectedIds) {
        const side = personaId === 'user' ? 'right' : null; // 'You' goes right, others unassigned
        
        await db.runAsync(
          `INSERT INTO conversation_personas (conversation_id, persona_id, side, added_at)
          VALUES (?, ?, ?, ?)`,
          conversationId,
          personaId,
          side,
          now
        );
      }

      console.log(`✓ Linked ${selectedIds.length} personas to conversation`);

      // Navigate back to home
      router.push(`/conversation-setup/${conversationId}`);
      
    } catch (error) {
      console.error('Failed to create conversation:', error);
      Alert.alert('Error', 'Failed to create conversation. Please try again.');
    }
  };


  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Conversation Name Input */}
      <TextInput
        style={styles.nameInput}
        placeholder="What do you want to talk about?"
        placeholderTextColor="#666666"
        value={conversationName}
        onChangeText={setConversationName}
      />

      {/* Persona Packs Scroll Area */}
      <ScrollView style={styles.packsScrollView} showsVerticalScrollIndicator={true}>
        {/* "You" Persona - Always at top */}
        <View style={styles.youPersonaContainer}>
          <TouchableOpacity
            style={styles.youPersonaItem}
            onPress={() => {}} // Cannot deselect
          >
            <View style={[styles.personaCircle, styles.youCircle, styles.personaCircleSelected]} />
            <Text style={styles.personaName}>You</Text>
          </TouchableOpacity>
        </View>

        {personaPacks.packs.map((pack) => (
          <View key={pack.id} style={styles.packContainer}>
            <Text style={styles.packTitle}>{pack.name}</Text>
            <Text style={styles.packDescription}>{pack.description}</Text>
            
            <View style={styles.personasGrid}>
              {pack.personas.map((persona) => {
                const isSelected = selectedPersonas.has(persona.id);
                return (
                  <TouchableOpacity
                    key={persona.id}
                    style={styles.personaItem}
                    onPress={() => togglePersona(persona.id)}
                  >
                    <View style={[
                      styles.personaCircle,
                      { backgroundColor: persona.color },
                      isSelected && styles.personaCircleSelected
                    ]} />
                    <Text style={styles.personaName}>{persona.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Make Your Own Button */}
      <TouchableOpacity 
        style={styles.makeYourOwnButton}
        onPress={() => router.push('/(tabs)/create-persona')}
      >
        <Text style={styles.makeYourOwnText}>Make Your Own</Text>
      </TouchableOpacity>

      {/* Custom Personas Area */}
      <ScrollView style={styles.customPersonasContainer} horizontal showsHorizontalScrollIndicator={false}>
        {customPersonas.length === 0 ? (
          <View style={styles.customPersonasEmpty}>
            <Text style={styles.customPersonasPlaceholder}>
              Your custom personas will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.customPersonasGrid}>
            {customPersonas.map((persona) => {
              const isSelected = selectedPersonas.has(persona.id);
              return (
                <TouchableOpacity
                  key={persona.id}
                  style={styles.customPersonaItem}
                  onPress={() => togglePersona(persona.id)}
                >
                  <View style={[
                    styles.personaCircle,
                    { backgroundColor: persona.color },
                    isSelected && styles.personaCircleSelected
                  ]} />
                  <Text style={styles.personaName}>{persona.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Selection Counter */}
      <Text style={styles.selectionCounter}>
        {selectedPersonas.size} persona(s) selected
      </Text>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#231f20',
    padding: 20,
  },
  nameInput: {
    backgroundColor: '#2a2626',
    color: 'white',
    fontSize: 18,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  packsScrollView: {
    flex: 1,
    backgroundColor: '#2a2626',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  youPersonaContainer: {
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3636',
    marginBottom: 15,
  },
  youPersonaItem: {
    alignItems: 'center',
  },
  youCircle: {
    backgroundColor: '#FFFFFF',
  },
  packContainer: {
    backgroundColor: '#3a3636',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  packTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  packDescription: {
    color: '#aaaaaa',
    fontSize: 14,
    marginBottom: 15,
  },
  personasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  personaItem: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 20,
  },
  personaCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  personaCircleSelected: {
    borderColor: 'white',
  },
  personaName: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
  makeYourOwnButton: {
    backgroundColor: '#3a3636',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  makeYourOwnText: {
    color: 'white',
    fontSize: 14,
  },
  customPersonasContainer: {
    backgroundColor: '#2a2626',
    borderRadius: 8,
    marginBottom: 15,
    maxHeight: 100,
    paddingVertical: 10,
  },
  customPersonasEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 300,
    paddingVertical: 20,
  },
  customPersonasPlaceholder: {
    color: '#666666',
    fontSize: 12,
    fontStyle: 'italic',
  },
  customPersonasGrid: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    gap: 15,
  },
  customPersonaItem: {
    alignItems: 'center',
    width: 70,
  },
  selectionCounter: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
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
  doneButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#231f20',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
