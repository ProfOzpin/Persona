import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Database schema version for migrations
 */
const SCHEMA_VERSION = 1;

/**
 * Initializes all database tables.
 * This is idempotent - safe to call multiple times.
 */
export async function initializeSchema(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`
      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_info (
        version INTEGER PRIMARY KEY
      );

      -- Personas: The different perspectives/personalities
      CREATE TABLE IF NOT EXISTS personas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL,
        is_custom INTEGER DEFAULT 1,
        pack_name TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Conversations: Journal threads
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_message_at INTEGER
      );

      -- Messages: Individual messages in conversations
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        persona_id TEXT,
        content TEXT NOT NULL,
        is_user INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL
      );

      -- ConversationPersonas: Which personas are available in each conversation
      CREATE TABLE IF NOT EXISTS conversation_personas (
        conversation_id TEXT NOT NULL,
        persona_id TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (conversation_id, persona_id),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_messages_conversation 
        ON messages(conversation_id, created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_messages_persona 
        ON messages(persona_id);
      
      CREATE INDEX IF NOT EXISTS idx_conversations_updated 
        ON conversations(updated_at DESC);
    `);

    // Check/update schema version
    const result = await db.getFirstAsync<{ version: number }>(
      'SELECT version FROM schema_info'
    );

    if (!result) {
      await db.runAsync('INSERT INTO schema_info (version) VALUES (?)', SCHEMA_VERSION);
      console.log(`✓ Database schema initialized (v${SCHEMA_VERSION})`);
    } else if (result.version < SCHEMA_VERSION) {
      // Future: Add migration logic here
      await db.runAsync('UPDATE schema_info SET version = ?', SCHEMA_VERSION);
      console.log(`✓ Database schema updated to v${SCHEMA_VERSION}`);
    }

  } catch (error) {
    console.error('Failed to initialize schema:', error);
    throw error;
  }
}
