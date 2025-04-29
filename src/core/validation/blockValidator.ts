import { Block, BlockHeader } from '../../types/types';
import { sha256Hash, isHashBelowCeiling } from '../../utils/hashUtils';
import { SimulatorConfig } from '../../config/config';
import { validateTransaction } from './transactionValidator';
import { updateUTXOSet } from '../blockchain/utxo';

/**
 * Creates a block header hash by hashing the header
 */
export const calculateBlockHeaderHash = (header: BlockHeader): string => {
  return sha256Hash(header);
};

/**
 * Calculates the hash of all transactions in a block
 */
export const calculateTransactionHash = (transactions: any[]): string => {
  return sha256Hash(transactions);
};

/**
 * Validates a block against the blockchain rules
 * Returns true if valid, false otherwise
 */
export const validateBlock = (
  block: Block, 
  previousBlock: Block | null,
  utxoSet: { [key: string]: any }
): boolean => {
  const { header, transactions } = block;
  
  // 1. Validate block has at least one transaction (the coinbase)
  if (transactions.length === 0) {
    console.error('Block has no transactions');
    return false;
  }
  
  // Create a temporary UTXO set for sequential validation
  // This allows transactions within the same block to reference outputs
  // created by earlier transactions in the block
  let tempUtxoSet = { ...utxoSet };
  
  // 2. First transaction must be a coinbase transaction
  if (!validateTransaction(transactions[0], tempUtxoSet, header.height, true)) {
    console.error('First transaction is not a valid coinbase transaction');
    return false;
  }
  
  // Update the temporary UTXO set with the coinbase transaction
  tempUtxoSet = updateUTXOSet(tempUtxoSet, transactions[0]);
  
  // 3. Validate all other transactions sequentially, updating the UTXO set after each one
  for (let i = 1; i < transactions.length; i++) {
    if (!validateTransaction(transactions[i], tempUtxoSet, header.height)) {
      console.error(`Transaction at index ${i} is invalid`);
      return false;
    }
    
    // Update the temporary UTXO set with this transaction
    tempUtxoSet = updateUTXOSet(tempUtxoSet, transactions[i]);
  }
  
  // 4. Validate transaction hash in header matches the hash of all transactions
  const calculatedTransactionHash = calculateTransactionHash(transactions);
  if (header.transactionHash !== calculatedTransactionHash) {
    console.error(`Transaction hash mismatch: ${header.transactionHash} !== ${calculatedTransactionHash}`);
    return false;
  }
  
  // 5. Validate previous header hash matches the hash of the previous block
  // Note: This function assumes it's not validating a genesis block
  // Genesis blocks are trusted by construction and added directly to the blockchain
  if (!previousBlock) {
    console.error('Cannot validate a block without a previous block reference');
    return false;
  }
  const previousBlockHash = calculateBlockHeaderHash(previousBlock.header);
  if (header.previousHeaderHash !== previousBlockHash) {
    console.error(`Previous header hash mismatch: ${header.previousHeaderHash} !== ${previousBlockHash}`);
    return false;
  }
  
  // 6. Validate block height is one more than previous block
  if (header.height !== previousBlock.header.height + 1) {
    console.error(`Block height mismatch: ${header.height} !== ${previousBlock.header.height + 1}`);
    return false;
  }
  
  // 7. Validate block timestamp is reasonable
  const now = Date.now();
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  if (header.timestamp > now + twoHoursInMs || header.timestamp < now - twoHoursInMs) {
    console.error(`Block timestamp is unreasonable: ${header.timestamp}`);
    return false;
  }
  
  // 8. Validate block hash is below ceiling
  const blockHash = calculateBlockHeaderHash(header);
  if (!isHashBelowCeiling(blockHash, SimulatorConfig.CEILING)) {
    console.error(`Block hash is not below ceiling: ${blockHash}`);
    return false;
  }
  
  return true;
};
