import { Block, BlockHeader, Transaction } from '../../types/types';
import { SimulatorConfig } from '../../config/config';
import { calculateTransactionHash, calculateBlockHeaderHash } from '../validation/blockValidator';



/**
 * Creates a new block template ready for mining
 */
export const createBlockTemplate = (
  previousBlock: Block | null,
  transactions: Transaction[]
): Block => {
  const height = previousBlock ? previousBlock.header.height + 1 : 0;
  const previousHeaderHash = previousBlock ? previousBlock.hash! : SimulatorConfig.GENESIS_PREV_HASH;
  
  const header: BlockHeader = {
    transactionHash: calculateTransactionHash(transactions),
    timestamp: Date.now(),
    previousHeaderHash,
    ceiling: parseInt(SimulatorConfig.CEILING, 16),
    nonce: 0,
    height
  };
  
  // Calculate an initial hash for the block header
  // Note: This is not a mined hash, just a placeholder that will be replaced during mining
  const initialHash = calculateBlockHeaderHash(header);
  
  return {
    header,
    transactions,
    hash: initialHash
  };
};

/**
 * Creates a simple coinbase transaction for the genesis block
 * This avoids circular dependencies with the transaction module
 */
const createGenesisCoinbaseTransaction = (minerNodeId: string): Transaction => {
  // Generate a deterministic address for the miner based on the node ID
  // This is a simplified approach for the genesis block
  const minerAddress = `address-${minerNodeId}`;
  
  return {
    inputs: [{ sourceOutputId: SimulatorConfig.REWARDER_NODE_ID }],
    outputs: [{ 
      idx: 0, 
      nodeId: minerNodeId, 
      value: SimulatorConfig.BLOCK_REWARD,
      lock: minerAddress // Add lock field for consistency with other transactions even tho this wont be verified
    }],
    timestamp: Date.now(),
    txid: 'genesis-coinbase-transaction' // Simple fixed ID for genesis block
  };
};

/**
 * Creates the genesis block
 */
export const createGenesisBlock = (minerNodeId: string): Block => {
  // Create a simple coinbase transaction for the genesis block
  const coinbaseTransaction = createGenesisCoinbaseTransaction(minerNodeId);
  const transactions = [coinbaseTransaction];
  
  const block = createBlockTemplate(null, transactions);
  
  // Calculate the actual hash of the genesis block header
  // This ensures each node has a unique genesis block hash based on its coinbase transaction
  block.hash = calculateBlockHeaderHash(block.header);
  
  return block;
};
