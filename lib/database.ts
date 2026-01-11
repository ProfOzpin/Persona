import * as SQLite from 'expo-sqlite';
import { initializeSchema } from './schema';
import { getEncryptionKey } from './security';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initializes and returns the encrypted database instance.
 * Safe to call multiple times - returns existing instance if already initialized.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (db) return db;

  const encryptionKey = getEncryptionKey();
  
  db = SQLite.openDatabaseSync('persona.db', {
    enableCRSQLite: false,
    useNewConnection: true,
  });

  // Enable SQLCipher encryption
  db.execSync(`PRAGMA key = '${encryptionKey}';`);
  
  console.log('✓ Database initialized with encryption');
  
  // Initialize schema
  initializeSchema(db);
  
  return db;
}

/**
 * Resets the database by dropping all tables and reinitializing.
 * FOR DEVELOPMENT ONLY!
 */
export async function resetDatabase(): Promise<void> {
  try {
    const database = getDatabase();
    
    console.log('⚠️  Resetting database...');
    
    // Drop all tables
    await database.execAsync(`
      DROP TABLE IF EXISTS conversation_personas;
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS conversations;
      DROP TABLE IF EXISTS personas;
      DROP TABLE IF EXISTS schema_info;
    `);
    
    console.log('✓ All tables dropped');
    
    // Reinitialize schema
    await initializeSchema(database);
    
    console.log('✓ Database reset complete');
  } catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  }
}
