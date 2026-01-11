import { SQLiteDatabase } from 'expo-sqlite';

const SCHEMA_VERSION = 2;

export async function initializeSchema(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync(`
      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_info (
        version INTEGER PRIMARY KEY
      );

      -- Personas: Both built-in (is_custom=0) and custom (is_custom=1)
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
        last_message_at INTEGER,
        flow_mode TEXT DEFAULT 'full_control' CHECK(flow_mode IN ('full_control', 'random')),
        persona_sequence TEXT,
        current_persona_index INTEGER DEFAULT 0
      );


      -- Messages: Individual messages in conversations
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        persona_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
      );

      -- ConversationPersonas: Which personas are available in each conversation
      CREATE TABLE IF NOT EXISTS conversation_personas (
        conversation_id TEXT NOT NULL,
        persona_id TEXT NOT NULL,
        side TEXT CHECK(side IN ('left', 'right')),
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
      // Migration for existing databases
      if (result.version < 2) {
        await db.execAsync(`
          ALTER TABLE conversations ADD COLUMN flow_mode TEXT DEFAULT 'full_control' CHECK(flow_mode IN ('full_control', 'random'));
          ALTER TABLE conversations ADD COLUMN persona_sequence TEXT;
          ALTER TABLE conversations ADD COLUMN current_persona_index INTEGER DEFAULT 0;
        `);
        console.log('✓ Migrated database to v2');
      }
      await db.runAsync('UPDATE schema_info SET version = ?', SCHEMA_VERSION);
      console.log(`✓ Database schema updated to v${SCHEMA_VERSION}`);
    }


    // Ensure "You" persona exists
    await ensureYouPersonaExists(db);

  } catch (error) {
    console.error('Failed to initialize schema:', error);
    throw error;
  }
}

/**
 * Ensures the special "You" persona exists in the database
 */
async function ensureYouPersonaExists(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync(
    'SELECT id FROM personas WHERE id = ?',
    'user'
  );

  if (!existing) {
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO personas (id, name, description, color, is_custom, pack_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      'user',
      'You',
      'Your own voice and perspective',
      '#FFFFFF',
      null,
      now,
      now
    );
    console.log('✓ Created "You" persona');
  }
}
