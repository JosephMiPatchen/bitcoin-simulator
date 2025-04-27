import { Block, BlockHeader, Transaction } from '../../types/types';
import { sha256Hash, isHashBelowCeiling } from '../../utils/hashUtils';
import { SimulatorConfig } from '../../config/config';
import { validateTransaction } from './transaction';

/**
 * Creates a block header hash by hashing the header
 */
export const calculateBlockHeaderHash = (header: BlockHeader): string => {
  return sha256Hash(header);
};

/**
 * Calculates the hash of all transactions in a block
 */
export const calculateTransactionHash = (transactions: Transaction[]): string => {
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
  
  // 2. First transaction must be a coinbase transaction
  if (!validateTransaction(transactions[0], utxoSet, header.height, true)) {
    console.error('First transaction is not a valid coinbase transaction');
    return false;
  }
  
  // 3. Validate all other transactions
  for (let i = 1; i < transactions.length; i++) {
    if (!validateTransaction(transactions[i], utxoSet, header.height)) {
      console.error(`Transaction at index ${i} is invalid`);
      return false;
    }
  }
  
  // 4. Validate transaction hash in header matches the hash of all transactions
  const calculatedTransactionHash = calculateTransactionHash(transactions);
  if (header.transactionHash !== calculatedTransactionHash) {
    console.error(`Transaction hash mismatch: ${header.transactionHash} !== ${calculatedTransactionHash}`);
    return false;
  }
  
  // 5. Validate previous header hash matches the hash of the previous block
  if (previousBlock) {
    if (header.previousHeaderHash !== previousBlock.hash) {
      console.error(`Previous header hash mismatch: ${header.previousHeaderHash} !== ${previousBlock.hash}`);
      return false;
    }
    
    // 6. Validate block height is one more than previous block
    if (header.height !== previousBlock.header.height + 1) {
      console.error(`Block height mismatch: ${header.height} !== ${previousBlock.header.height + 1}`);
      return false;
    }
  } else {
    // For genesis block, previous header hash should match GENESIS_BLOCK_HASH
    if (header.previousHeaderHash !== SimulatorConfig.GENESIS_BLOCK_HASH) {
      console.error(`Genesis block previous header hash mismatch: ${header.previousHeaderHash} !== ${SimulatorConfig.GENESIS_BLOCK_HASH}`);
      return false;
    }
    
    // Genesis block should have height 0
    if (header.height !== 0) {
      console.error(`Genesis block height mismatch: ${header.height} !== 0`);
      return false;
    }
  }
  
  // 7. Validate block timestamp is reasonable
  const now = Date.now();
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  if (header.timestamp > now + twoHoursInMs || header.timestamp < now - twoHoursInMs) {
    console.error(`Block timestamp is unreasonable: ${header.timestamp}`);
    return false;
  }
  
  // 8. Validate block hash is below ceiling
  const blockHash = block.hash || calculateBlockHeaderHash(header);
  if (!isHashBelowCeiling(blockHash, SimulatorConfig.CEILING)) {
    console.error(`Block hash is not below ceiling: ${blockHash}`);
    return false;
  }
  
  return true;
};

/**
 * Creates a new block template ready for mining
 */
export const createBlockTemplate = (
  previousBlock: Block | null,
  transactions: Transaction[]
): Block => {
  const height = previousBlock ? previousBlock.header.height + 1 : 0;
  const previousHeaderHash = previousBlock ? previousBlock.hash! : SimulatorConfig.GENESIS_BLOCK_HASH;
  
  const header: BlockHeader = {
    transactionHash: calculateTransactionHash(transactions),
    timestamp: Date.now(),
    previousHeaderHash,
    ceiling: parseInt(SimulatorConfig.CEILING, 16),
    nonce: 0,
    height
  };
  
  return {
    header,
    transactions
  };
};

/**
 * Creates the genesis block
 */
export const createGenesisBlock = (minerNodeId: string): Block => {
  // Import here to avoid circular dependency
  const { createCoinbaseTransaction } = require('./transaction');
  
  const coinbaseTransaction = createCoinbaseTransaction(minerNodeId, 0);
  const transactions = [coinbaseTransaction];
  
  const block = createBlockTemplate(null, transactions);
  
  // For the genesis block, we'll just set a valid hash without mining
  block.hash = SimulatorConfig.GENESIS_BLOCK_HASH;
  
  return block;
};
