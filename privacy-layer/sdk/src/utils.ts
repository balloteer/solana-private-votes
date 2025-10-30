/**
 * Utility functions for byte array operations
 */

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate random bytes
 */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof window !== "undefined" && window.crypto) {
    // Browser
    window.crypto.getRandomValues(bytes);
  } else {
    // Node.js
    const crypto = require("crypto");
    const buffer = crypto.randomBytes(length);
    bytes.set(buffer);
  }
  return bytes;
}

/**
 * Ensure a value is exactly 32 bytes
 * Pads or truncates as needed
 */
export function to32Bytes(data: Uint8Array | string | number[]): Uint8Array {
  const bytes = new Uint8Array(32);

  if (typeof data === "string") {
    const input = hexToBytes(data);
    bytes.set(input.slice(0, 32));
  } else {
    const input = new Uint8Array(data);
    bytes.set(input.slice(0, 32));
  }

  return bytes;
}

/**
 * Convert number to little-endian bytes
 */
export function numberToLeBytes(num: number, length: number = 8): Uint8Array {
  const bytes = new Uint8Array(length);
  let value = num;
  for (let i = 0; i < length; i++) {
    bytes[i] = value & 0xff;
    value = value / 256;
  }
  return bytes;
}
