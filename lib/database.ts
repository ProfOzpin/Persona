import * as SQLite from 'expo-sqlite';
import { getDatabaseEncryptionKey } from './security';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Opens the encrypted database and sets the encryption key.
 * Must be called before any database operations.
 */
export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  try {
    // Open database
    db = await SQLite.openDatabaseAsync('persona.db');
    
    // Get encryption key from secure storage
    const encryptionKey = await getDatabaseEncryptionKey();
    
    // CRITICAL: Set encryption key immediately after opening
    // This must be the first statement executed
    await db.execAsync(`PRAGMA key = '${encryptionKey}';`);
    
    // Verify encryption is working
    await db.execAsync('PRAGMA cipher_version;');
    
    console.log('✓ Database initialized with encryption');
    
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Closes the database connection.
 */
export function closeDatabase(): void {
  if (db) {
    db.closeSync();
    db = null;
  }
}

/**
 * Gets the current database instance.
 * Throws if database hasn't been initialized.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}
