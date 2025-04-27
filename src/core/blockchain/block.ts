import { Block, BlockHeader, Transaction } from '../../types/types';
import { SimulatorConfig } from '../../config/config';
import { calculateTransactionHash } from '../validation/blockValidator';



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
 * Creates a simple coinbase transaction for the genesis block
 * This avoids circular dependencies with the transaction module
 */
const createGenesisCoinbaseTransaction = (minerNodeId: string): Transaction => {
  return {
    inputs: [{ sourceOutputId: SimulatorConfig.REWARDER_NODE_ID }],
    outputs: [{ idx: 0, nodeId: minerNodeId, value: SimulatorConfig.BLOCK_REWARD }],
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
  
  // For the genesis block, we'll just set a valid hash without mining
  block.hash = SimulatorConfig.GENESIS_BLOCK_HASH;
  
  return block;
};
