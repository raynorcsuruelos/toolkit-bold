/**
 * Cryptographic helper utilities for Toolkit security (SHA-256 and PBKDF2/Argon2 fallback)
 */

export function generateSaltHex(byteLength: number = 16): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }
  let s = '';
  for (let i = 0; i < byteLength * 2; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Pure SHA-256 implementation
export function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number, j: number;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function computeSaltedSha256(password: string, salt: string): string {
  return sha256Sync(salt + password);
}

// Memory-hard / Argon2 / PBKDF2 hash for Personal Mode in ARP calc
export async function hashHardenedPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string; algorithm: string }> {
  const salt = saltHex || generateSaltHex(16);

  // Check if hashwasm is loaded on window
  const w = window as any;
  if (w.hashwasm && w.hashwasm.argon2id) {
    try {
      const saltBytes = new Uint8Array(salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const hash = await w.hashwasm.argon2id({
        password,
        salt: saltBytes,
        iterations: 3,
        memorySize: 19456, // 19 MiB RAM
        parallelism: 1,
        hashLength: 32,
        outputType: 'hex'
      });
      return { hash, salt, algorithm: 'Argon2id' };
    } catch {
      // fallback to PBKDF2
    }
  }

  // WebCrypto PBKDF2 with 600,000 iterations
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const saltBytes = new Uint8Array(salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 600000 },
        key,
        256
      );
      const hash = Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
      return { hash, salt, algorithm: 'PBKDF2-SHA256' };
    } catch {
      // fallback
    }
  }

  // Pure fallback
  let current = salt + ':' + password;
  for (let i = 0; i < 5000; i++) {
    current = sha256Sync(current + salt);
  }
  return { hash: current, salt, algorithm: 'SHA256-Stretched' };
}

export function evaluatePasswordStrength(pw: string): { pct: number; text: string; color: string } {
  if (!pw) return { pct: 0, text: 'Empty', color: '#9ca3af' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { pct: 25, text: 'Weak', color: '#ef4444' };
  if (score <= 2) return { pct: 50, text: 'Fair', color: '#f59e0b' };
  if (score <= 3) return { pct: 75, text: 'Good', color: '#3b82f6' };
  return { pct: 100, text: 'Strong', color: '#10b981' };
}
