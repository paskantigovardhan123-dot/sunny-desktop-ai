/**
 * Storage manager for Sunny Desktop AI.
 * Uses Electron's native safeStorage when running in Electron,
 * and AES-GCM Web Crypto encryption when running in Web preview mode.
 */

const WEB_STORAGE_CIPHER_KEY = 'sunny_encrypted_gemini_key_v1';
const WEB_STORAGE_SALT_KEY = 'sunny_crypto_salt_v1';
const WEB_STORAGE_IV_KEY = 'sunny_crypto_iv_v1';

async function getOrCreateWebCryptoKey(): Promise<CryptoKey> {
  let saltStr = localStorage.getItem(WEB_STORAGE_SALT_KEY);
  if (!saltStr) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    saltStr = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(WEB_STORAGE_SALT_KEY, saltStr);
  }

  // Derive key from device-bound seed
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode('Sunny-Desktop-AI-Local-SafeStorage-Bridge-' + saltStr),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const saltBytes = new Uint8Array(saltStr.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function saveApiKey(key: string): Promise<boolean> {
  const trimmed = key.trim();
  if (!trimmed) return false;

  // 1. If in Electron, use safeStorage through IPC bridge
  if (window.electronAPI?.safeStorage) {
    try {
      return await window.electronAPI.safeStorage.saveKey(trimmed);
    } catch (err) {
      console.error('Electron safeStorage save error:', err);
    }
  }

  // 2. Web Crypto AES-GCM fallback
  try {
    const cryptoKey = await getOrCreateWebCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      enc.encode(trimmed)
    );

    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const cipherHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');

    localStorage.setItem(WEB_STORAGE_IV_KEY, ivHex);
    localStorage.setItem(WEB_STORAGE_CIPHER_KEY, cipherHex);
    return true;
  } catch (err) {
    console.error('Web Crypto encrypt error:', err);
    return false;
  }
}

export async function getApiKey(): Promise<string | null> {
  // 1. If in Electron, retrieve decrypted key from safeStorage
  if (window.electronAPI?.safeStorage) {
    try {
      const key = await window.electronAPI.safeStorage.getKey();
      if (key && key.trim()) return key.trim();
    } catch (err) {
      console.error('Electron safeStorage get error:', err);
    }
  }

  // 2. Web Crypto AES-GCM fallback
  try {
    const cipherHex = localStorage.getItem(WEB_STORAGE_CIPHER_KEY);
    const ivHex = localStorage.getItem(WEB_STORAGE_IV_KEY);
    if (!cipherHex || !ivHex) return null;

    const cryptoKey = await getOrCreateWebCryptoKey();
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      cipherBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted).trim();
  } catch (err) {
    console.error('Web Crypto decrypt error:', err);
    return null;
  }
}

export async function removeApiKey(): Promise<boolean> {
  if (window.electronAPI?.safeStorage) {
    try {
      await window.electronAPI.safeStorage.removeKey();
    } catch (err) {
      console.error('Electron safeStorage remove error:', err);
    }
  }

  localStorage.removeItem(WEB_STORAGE_CIPHER_KEY);
  localStorage.removeItem(WEB_STORAGE_IV_KEY);
  return true;
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return Boolean(key && key.length > 5);
}
