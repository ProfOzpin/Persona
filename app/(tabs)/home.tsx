import { StyleSheet, View, Image, TouchableOpacity, Text, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { resetDatabase, getDatabase } from '@/lib/database';

interface Conversation {
  id: string;
  title: string;
  last_message_content: string | null;
  last_message_at: number | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Load conversations from database
  const loadConversations = useCallback(async () => {
    try {
      const db = getDatabase();
      const results = await db.getAllAsync<Conversation>(`
        SELECT 
          c.id,
          c.title,
          m.content as last_message_content,
          m.created_at as last_message_at
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE m.created_at = (
          SELECT MAX(created_at) 
          FROM messages 
          WHERE conversation_id = c.id
        ) OR m.created_at IS NULL
        ORDER BY COALESCE(m.created_at, c.created_at) DESC
      `);
      setConversations(results);
      console.log(`✓ Loaded ${results.length} conversations`);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  // Reload conversations when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  const handleResetDatabase = async () => {
    Alert.alert(
      'Reset Database',
      'This will delete ALL data and reinitialize the database. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase();
              await loadConversations(); // Reload after reset
              Alert.alert('Success', 'Database has been reset!');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset database');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: number | null): string => {
    if (!timestamp) return '';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    // Format as date
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
        />
        <TouchableOpacity>
          <Image
            source={require('@/assets/icons/menu-icon.png')}
            style={styles.menuIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content - Conversations List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Tap + to start a new conversation</Text>
          </View>
        ) : (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationCard}
              onPress={() => router.push(`/conversation/${conversation.id}`)}
            >
              <View style={styles.conversationContent}>
                <Text style={styles.conversationTitle} numberOfLines={1}>
                  {conversation.title || 'Untitled'}
                </Text>
                <Text style={styles.conversationPreview} numberOfLines={2}>
                  {conversation.last_message_content || 'No messages yet'}
                </Text>
              </View>
              <Text style={styles.conversationTime}>
                {formatTimestamp(conversation.last_message_at)}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {/* DEV: Reset Database Button */}
        <TouchableOpacity 
          style={styles.devResetButton}
          onPress={handleResetDatabase}
        >
          <Text style={styles.devResetText}>🔧 Reset Database (DEV)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity>
          <Image
            source={require('@/assets/icons/messages-icon.png')}
            style={styles.navIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity>
          <Image
            source={require('@/assets/icons/journal-icon.png')}
            style={styles.navIcon}
          />
        </TouchableOpacity>
      </View>

      {/* New Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/(tabs)/new-conversation')}
      >
        <Image
          source={require('@/assets/icons/new-message-icon.png')}
          style={styles.fabIcon}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#231f20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  menuIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 10,
  },
  emptySubtext: {
    color: '#999999',
    fontSize: 14,
  },
  conversationCard: {
    backgroundColor: '#2a2626',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  conversationContent: {
    flex: 1,
    marginRight: 10,
  },
  conversationTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  conversationPreview: {
    color: '#aaaaaa',
    fontSize: 14,
    lineHeight: 20,
  },
  conversationTime: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
  },
  devResetButton: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 30,
  },
  devResetText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
    backgroundColor: 'white',
    paddingHorizontal: 30,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  fab: {
    position: 'absolute',
    bottom: 70,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 30,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
});
