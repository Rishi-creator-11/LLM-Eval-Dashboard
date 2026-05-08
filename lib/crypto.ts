const ENCRYPTION_KEY_NAME = "llm-eval-dashboard-key"
const SALT = new Uint8Array([0x4c, 0x4c, 0x4d, 0x45, 0x76, 0x61, 0x6c, 0x44, 0x61, 0x73, 0x68, 0x62, 0x6f, 0x61, 0x72, 0x64])

async function getKey(): Promise<CryptoKey> {
  const raw = localStorage.getItem(ENCRYPTION_KEY_NAME)
  if (raw) {
    const buf = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0))
    return crypto.subtle.importKey("raw", buf, "AES-GCM", false, ["encrypt", "decrypt"])
  }
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
  const exported = await crypto.subtle.exportKey("raw", key)
  const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)))
  localStorage.setItem(ENCRYPTION_KEY_NAME, b64)
  return key
}

export async function encrypt(text: string): Promise<string> {
  if (!text) return ""
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoder = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(text))
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(b64: string): Promise<string> {
  if (!b64) return ""
  try {
    const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    const key = await getKey()
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext)
    return new TextDecoder().decode(decrypted)
  } catch {
    return ""
  }
}
