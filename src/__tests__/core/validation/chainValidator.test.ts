import { validateChain } from '../../../core/validation/chainValidator';
import { Block, BlockHeader, Transaction } from '../../../types/types';
import { SimulatorConfig } from '../../../config/config';
import { sha256Hash } from '../../../utils/hashUtils';

describe('Chain Validator', () => {
  // Helper function to create a valid block
  const createValidBlock = (
    previousHash: string, 
    height: number, 
    timestamp: number = Date.now()
  ): Block => {
    const coinbaseTx: Transaction = {
      txid: `coinbase-tx-${height}`,
      inputs: [{ sourceOutputId: SimulatorConfig.REWARDER_NODE_ID }],
      outputs: [{ idx: 0, nodeId: 'node1', value: SimulatorConfig.BLOCK_REWARD }],
      timestamp
    };
    
    const transactions = [coinbaseTx];
    const transactionHash = sha256Hash(JSON.stringify(transactions));
    
    const header: BlockHeader = {
      transactionHash,
      timestamp,
      previousHeaderHash: previousHash,
      ceiling: parseInt(SimulatorConfig.CEILING, 16),
      nonce: 123456, // Assume this produces a valid hash
      height
    };
    
    const hash = '0000000000000000000000000000000000000000000000000000000000000001'; // Below ceiling
    
    return {
      header,
      transactions,
      hash
    };
  };
  
  // Create a valid blockchain
  const createValidChain = (length: number): Block[] => {
    const chain: Block[] = [];
    
    // Create genesis block
    const genesisBlock = createValidBlock(SimulatorConfig.GENESIS_BLOCK_HASH, 0, Date.now() - length * 10000);
    chain.push(genesisBlock);
    
    // Create subsequent blocks
    for (let i = 1; i < length; i++) {
      const previousBlock = chain[i - 1];
      const block = createValidBlock(
        previousBlock.hash!, 
        i, 
        previousBlock.header.timestamp + 10000 // 10 seconds later
      );
      chain.push(block);
    }
    
    return chain;
  };

  it('should validate a valid blockchain', () => {
    const chain = createValidChain(3); // Chain with 3 blocks
    
    const result = validateChain(chain);
    expect(result).toBe(true);
  });

  it('should validate a blockchain with only genesis block', () => {
    const chain = createValidChain(1); // Chain with just genesis block
    
    const result = validateChain(chain);
    expect(result).toBe(true);
  });

  it('should reject an empty blockchain', () => {
    const chain: Block[] = [];
    
    const result = validateChain(chain);
    expect(result).toBe(false);
  });

  it('should reject a blockchain with invalid block height sequence', () => {
    const chain = createValidChain(3);
    chain[1].header.height = 5; // Invalid height (should be 1)
    
    const result = validateChain(chain);
    expect(result).toBe(false);
  });

  it('should reject a blockchain with invalid previous hash reference', () => {
    const chain = createValidChain(3);
    chain[2].header.previousHeaderHash = 'invalid-previous-hash'; // Breaks the chain
    
    const result = validateChain(chain);
    expect(result).toBe(false);
  });

  it('should reject a blockchain with non-chronological timestamps', () => {
    const chain = createValidChain(3);
    chain[2].header.timestamp = chain[1].header.timestamp - 1000; // Earlier than previous block
    
    const result = validateChain(chain);
    expect(result).toBe(false);
  });

  it('should reject a blockchain with invalid genesis block', () => {
    const chain = createValidChain(3);
    chain[0].header.previousHeaderHash = 'invalid-genesis-hash'; // Should be GENESIS_BLOCK_HASH
    
    const result = validateChain(chain);
    expect(result).toBe(false);
  });

  it('should reject a blockchain with invalid genesis block height', () => {
    const chain = createValidChain(3);
    chain[0].header.height = 1; // Genesis block should have height 0
    
    const result = validateChain(chain);
    expect(result).toBe(false);
  });
});
