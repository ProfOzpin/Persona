import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ENCRYPTION_KEY_STORAGE_KEY = 'persona_db_encryption_key';

/**
 * Generates or retrieves the database encryption key (async).
 * Call this on app initialization before opening database.
 */
export async function initializeEncryptionKey(): Promise<string> {
  try {
    // Try to retrieve existing key
    let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
    
    if (!key) {
      // Generate new 256-bit key (32 bytes = 64 hex chars)
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      key = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Store in secure storage
      await SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, key);
    }
    
    return key;
  } catch (error) {
    throw new Error('Failed to initialize encryption key: ' + error);
  }
}

/**
 * Synchronously retrieves the encryption key.
 * MUST call initializeEncryptionKey() first during app startup.
 */
export function getEncryptionKey(): string {
  try {
    const key = SecureStore.getItem(ENCRYPTION_KEY_STORAGE_KEY);
    if (!key) {
      throw new Error('Encryption key not initialized. Call initializeEncryptionKey() first.');
    }
    return key;
  } catch (error) {
    throw new Error('Failed to get encryption key: ' + error);
  }
}

/**
 * WARNING: This permanently deletes the encryption key.
 * All encrypted data becomes unrecoverable.
 */
export async function deleteEncryptionKey(): Promise<void> {
  await SecureStore.deleteItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
}
