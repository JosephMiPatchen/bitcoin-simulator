/**
 * Utility functions for hashing operations
 * Uses crypto-js for SHA-256 implementation
 */

import SHA256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';

/**
 * Creates a SHA-256 hash of the input and returns it as a hex string
 * @param data Any data that can be JSON stringified
 * @returns Hex string representation of the SHA-256 hash
 */
export const sha256Hash = (data: any): string => {
  // Convert the data to a JSON string for consistent hashing
  const stringData = typeof data === 'string' ? data : JSON.stringify(data);
  return SHA256(stringData).toString(Hex);
};

/**
 * Compares two hex strings as numbers
 * Used for checking if a hash is below the mining ceiling
 * @param hash The hash to check
 * @param ceiling The ceiling value to compare against
 * @returns true if hash < ceiling
 */
export const isHashBelowCeiling = (hash: string, ceiling: string): boolean => {
  // Ensure hash and ceiling are both without '0x' prefix for consistent comparison
  const normalizedHash = hash.startsWith('0x') ? hash.substring(2) : hash;
  const normalizedCeiling = ceiling.startsWith('0x') ? ceiling.substring(2) : ceiling;
  
  // Compare strings character by character (hex values)
  if (normalizedHash.length !== normalizedCeiling.length) {
    // Pad with zeros if necessary
    const paddedHash = normalizedHash.padStart(normalizedCeiling.length, '0');
    const paddedCeiling = normalizedCeiling.padStart(normalizedHash.length, '0');
    return paddedHash < paddedCeiling;
  }
  
  return normalizedHash < normalizedCeiling;
};
