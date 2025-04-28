import { sha256Hash, isHashBelowCeiling } from '../../utils/hashUtils';

describe('Hash Utilities', () => {
  describe('sha256Hash', () => {
    it('should create consistent hashes for the same input', () => {
      const input = { test: 'data' };
      const hash1 = sha256Hash(input);
      const hash2 = sha256Hash(input);
      
      expect(hash1).toBe(hash2);
    });
    
    it('should create different hashes for different inputs', () => {
      const input1 = { test: 'data1' };
      const input2 = { test: 'data2' };
      
      const hash1 = sha256Hash(input1);
      const hash2 = sha256Hash(input2);
      
      expect(hash1).not.toBe(hash2);
    });
    
    it('should handle string inputs', () => {
      const input = 'test string';
      const hash = sha256Hash(input);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces a 64-character hex string
    });
  });
  
  describe('isHashBelowCeiling', () => {
    it('should return true when hash is below ceiling', () => {
      const hash = '0000000000000000000000000000000000000000000000000000000000000001';
      const ceiling = '0000000000000000000000000000000000000000000000000000000000000002';
      
      expect(isHashBelowCeiling(hash, ceiling)).toBe(true);
    });
    
    it('should return false when hash is above ceiling', () => {
      const hash = '0000000000000000000000000000000000000000000000000000000000000002';
      const ceiling = '0000000000000000000000000000000000000000000000000000000000000001';
      
      expect(isHashBelowCeiling(hash, ceiling)).toBe(false);
    });
    
    it('should handle hex prefixes', () => {
      const hash = '0x0000000000000000000000000000000000000000000000000000000000000001';
      const ceiling = '0x0000000000000000000000000000000000000000000000000000000000000002';
      
      expect(isHashBelowCeiling(hash, ceiling)).toBe(true);
    });
    
    it('should handle different length strings', () => {
      const hash = '1'; // Short hash
      const ceiling = '0000000000000000000000000000000000000000000000000000000000000002';
      
      expect(isHashBelowCeiling(hash, ceiling)).toBe(true);
    });
  });
});
