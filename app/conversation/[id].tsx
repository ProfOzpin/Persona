import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getDatabase } from '@/lib/database';

interface Message {
  id: string;
  conversation_id: string;
  persona_id: string;
  content: string;
  created_at: number;
}

interface Persona {
  id: string;
  name: string;
  color: string;
  side: string | null;
}

interface Conversation {
  id: string;
  title: string;
  flow_mode: 'full_control' | 'random';
  persona_sequence: string | null;
  current_persona_index: number;
}

const MESSAGE_PAGE_SIZE = 50;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);

  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversation();
    loadPersonas();
    loadMessages();
  }, [id]);

  const loadConversation = async () => {
    try {
      const db = getDatabase();
      const conv = await db.getFirstAsync<Conversation>(
        'SELECT id, title, flow_mode, persona_sequence, current_persona_index FROM conversations WHERE id = ?',
        id
      );
      setConversation(conv);
      
      // If random mode, set the current persona from sequence
      if (conv && conv.flow_mode === 'random' && conv.persona_sequence) {
        const sequence = JSON.parse(conv.persona_sequence) as string[];
        const currentPersonaId = sequence[conv.current_persona_index];
        const currentPersona = await db.getFirstAsync<Persona>(
          'SELECT p.id, p.name, p.color, cp.side FROM personas p INNER JOIN conversation_personas cp ON p.id = cp.persona_id WHERE p.id = ? AND cp.conversation_id = ?',
          currentPersonaId,
          id
        );
        if (currentPersona) {
          setSelectedPersona(currentPersona);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const loadPersonas = async () => {
    try {
      const db = getDatabase();
      const results = await db.getAllAsync<Persona>(`
        SELECT p.id, p.name, p.color, cp.side
        FROM personas p
        INNER JOIN conversation_personas cp ON p.id = cp.persona_id
        WHERE cp.conversation_id = ?
        ORDER BY p.name
      `, id);
      
      setPersonas(results);
      
      // Default to "You" persona
      const userPersona = results.find(p => p.id === 'user');
      if (userPersona) {
        setSelectedPersona(userPersona);
      }
    } catch (error) {
      console.error('Failed to load personas:', error);
    }
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const db = getDatabase();
      
      const results = await db.getAllAsync<Message>(
        `SELECT * FROM messages 
         WHERE conversation_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        id,
        MESSAGE_PAGE_SIZE
      );
      
      setMessages(results.reverse());
      console.log(`✓ Loaded ${results.length} messages`);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const advanceRandomSequence = async () => {
    if (!conversation || conversation.flow_mode !== 'random') return;
    
    try {
      const db = getDatabase();
      const sequence = JSON.parse(conversation.persona_sequence || '[]') as string[];
      let nextIndex = conversation.current_persona_index + 1;
      
      // If we reached the end, reshuffle and start over
      if (nextIndex >= sequence.length) {
        const shuffled = [...sequence].sort(() => Math.random() - 0.5);
        await db.runAsync(
          'UPDATE conversations SET persona_sequence = ?, current_persona_index = 0 WHERE id = ?',
          JSON.stringify(shuffled),
          id
        );
        nextIndex = 0;
        setConversation(prev => prev ? { ...prev, persona_sequence: JSON.stringify(shuffled), current_persona_index: 0 } : null);
        console.log('✓ Reshuffled sequence:', shuffled);
      } else {
        await db.runAsync(
          'UPDATE conversations SET current_persona_index = ? WHERE id = ?',
          nextIndex,
          id
        );
        setConversation(prev => prev ? { ...prev, current_persona_index: nextIndex } : null);
      }
      
      // Load the next persona
      const nextPersonaId = sequence[nextIndex];
      const nextPersona = await db.getFirstAsync<Persona>(
        'SELECT p.id, p.name, p.color, cp.side FROM personas p INNER JOIN conversation_personas cp ON p.id = cp.persona_id WHERE p.id = ? AND cp.conversation_id = ?',
        nextPersonaId,
        id
      );
      if (nextPersona) {
        setSelectedPersona(nextPersona);
        console.log(`✓ Advanced to ${nextPersona.name}`);
      }
    } catch (error) {
      console.error('Failed to advance sequence:', error);
    }
  };


  const handleSend = async () => {
    if (!inputText.trim() || !selectedPersona) return;

    const tempMessage: Message = {
      id: `temp_${Date.now()}`,
      conversation_id: id,
      persona_id: selectedPersona.id,
      content: inputText.trim(),
      created_at: Date.now(),
    };

    setMessages(prev => [...prev, tempMessage]);
    setInputText('');
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const db = getDatabase();
      const messageId = `msg_${Date.now()}`;
      const now = Date.now();

      // Check if persona needs side assignment
      if (selectedPersona.side === null) {
        // Get the last message's persona side
        const lastMessage = await db.getFirstAsync<{ side: string | null }>(
          `SELECT cp.side 
          FROM messages m
          JOIN conversation_personas cp ON m.persona_id = cp.persona_id AND m.conversation_id = cp.conversation_id
          WHERE m.conversation_id = ?
          ORDER BY m.created_at DESC
          LIMIT 1`,
          id
        );

        // Determine new side
        let newSide: string;
        if (!lastMessage || lastMessage.side === null) {
          // First message or last was also null, default to left
          newSide = 'left';
        } else {
          // Opposite of last message
          newSide = lastMessage.side === 'left' ? 'right' : 'left';
        }

        // Update conversation_personas with the new side
        await db.runAsync(
          `UPDATE conversation_personas 
          SET side = ? 
          WHERE conversation_id = ? AND persona_id = ?`,
          newSide,
          id,
          selectedPersona.id
        );

        // Update local state
        setSelectedPersona({ ...selectedPersona, side: newSide });
        setPersonas(prev => 
          prev.map(p => p.id === selectedPersona.id ? { ...p, side: newSide } : p)
        );

        console.log(`✓ Assigned side "${newSide}" to persona ${selectedPersona.name}`);
      }

      // Insert the message
      await db.runAsync(
        `INSERT INTO messages (id, conversation_id, persona_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)`,
        messageId,
        id,
        selectedPersona.id,
        tempMessage.content,
        now
      );

      // Update conversation timestamp
      await db.runAsync(
        'UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE id = ?',
        now,
        now,
        id
      );

      setMessages(prev => 
        prev.map(msg => msg.id === tempMessage.id 
          ? { ...msg, id: messageId, created_at: now }
          : msg
        )
      );

      if (conversation?.flow_mode === 'random') {
        await advanceRandomSequence();
      }
      console.log('✓ Message sent');
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };


  const getPersonaForMessage = useCallback((personaId: string): Persona | undefined => {
    return personas.find(p => p.id === personaId);
  }, [personas]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const persona = getPersonaForMessage(item.persona_id);
    const isRight = persona?.side === 'right';
    
    return (
      <View
        style={[
          styles.messageBubble,
          isRight ? styles.messageBubbleRight : styles.messageBubbleLeft
        ]}
      >
        {!isRight && (
          <View style={[styles.personaDot, { backgroundColor: persona?.color || '#666' }]} />
        )}
        <View style={styles.messageContent}>
          <Text style={styles.personaName}>{persona?.name || 'Unknown'}</Text>
          <Text style={styles.messageText}>{item.content}</Text>
        </View>
        {isRight && (
          <View style={[styles.personaDot, { backgroundColor: persona?.color || '#666' }]} />
        )}
      </View>
    );
  }, [personas, getPersonaForMessage]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {conversation?.title || 'Conversation'}
        </Text>
        <TouchableOpacity>
          <Text style={styles.menuButton}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.messagesContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Start the conversation</Text>
          </View>
        }
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* Persona Selector */}
      <View style={styles.personaSelector}>
        <View style={styles.personaInfo}>
          <View style={[styles.personaDotLarge, { backgroundColor: selectedPersona?.color || '#FFFFFF' }]} />
          <Text style={styles.personaNameLarge}>{selectedPersona?.name || 'You'}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            if (conversation?.flow_mode === 'random') {
              advanceRandomSequence();
            } else {
              setShowPersonaPicker(true);
            }
          }}
        >
          <Text style={styles.changePersonaText}>
            {conversation?.flow_mode === 'random' ? 'Next Persona' : 'Change Persona'}
          </Text>
        </TouchableOpacity>
      </View>


      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#666666"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          returnKeyType="send"
          maxLength={1000}
        />
      </View>


      {/* Persona Picker Modal */}
      <Modal
        visible={showPersonaPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPersonaPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPersonaPicker(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select Persona</Text>
            
            <View style={styles.personaGrid}>
              {personas.map((persona) => (
                <TouchableOpacity
                  key={persona.id}
                  style={[
                    styles.personaGridItem,
                    selectedPersona?.id === persona.id && styles.personaGridItemSelected
                  ]}
                  onPress={() => {
                    setSelectedPersona(persona);
                    setShowPersonaPicker(false);
                  }}
                >
                  <View style={[styles.personaGridDot, { backgroundColor: persona.color }]} />
                  <Text style={styles.personaGridName}>{persona.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#231f20',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingTop: 15,
    backgroundColor: '#2a2626',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3636',
  },
  backButton: {
    color: 'white',
    fontSize: 28,
    fontWeight: '300',
    width: 40,
    textAlign: 'center',
    lineHeight: 28,        // ← Change from 32 to 28 (match fontSize)
    includeFontPadding: false,  // ← Add this (Android specific, removes extra padding)
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'left',
    marginHorizontal: 10,
  },
  menuButton: {
    color: 'white',
    fontSize: 24,
    width: 40,
    textAlign: 'right',
  },
  messagesContent: {
    padding: 15,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: '#666666',
    fontSize: 16,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  messageBubbleLeft: {
    justifyContent: 'flex-start',
  },
  messageBubbleRight: {
    justifyContent: 'flex-end',
  },
  personaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginHorizontal: 8,
  },
  messageContent: {
    maxWidth: '75%',
    backgroundColor: '#2a2626',
    borderRadius: 12,
    padding: 12,
  },
  personaName: {
    color: '#aaaaaa',
    fontSize: 12,
    marginBottom: 4,
  },
  messageText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 20,
  },
  personaSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2626',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#3a3636',
  },
  personaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personaDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  personaNameLarge: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  changePersonaText: {
    color: '#888888',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: 15,
    backgroundColor: '#2a2626',
    borderTopWidth: 1,
    borderTopColor: '#3a3636',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#3a3636',
    color: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
  },
  modalContent: {
    backgroundColor: '#2a2626',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  personaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  personaGridItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#3a3636',
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  personaGridItemSelected: {
    borderColor: 'white',
    backgroundColor: '#4a4646',
  },
  personaGridDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  personaGridName: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});
