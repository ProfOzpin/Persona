import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ENCRYPTION_KEY_STORAGE_KEY = 'persona_db_encryption_key';

/**
 * Generates or retrieves the database encryption key.
 * This key is unique per device installation and never leaves secure storage.
 */
export async function getDatabaseEncryptionKey(): Promise<string> {
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
 * WARNING: This permanently deletes the encryption key.
 * All encrypted data becomes unrecoverable.
 * Only use for app reset or data deletion features.
 */
export async function deleteEncryptionKey(): Promise<void> {
  await SecureStore.deleteItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
}
