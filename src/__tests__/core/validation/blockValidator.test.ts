import { validateBlock } from '../../../core/validation/blockValidator';
import { Block, BlockHeader, Transaction, UTXOSet } from '../../../types/types';
import { SimulatorConfig } from '../../../config/config';
import * as hashUtils from '../../../utils/hashUtils';
import { calculateTxid } from '../../../core/validation/transactionValidator';

// Mock the hash validation functions to make testing easier
jest.mock('../../../utils/hashUtils', () => {
  const original = jest.requireActual('../../../utils/hashUtils');
  return {
    ...original,
    isHashBelowCeiling: jest.fn().mockReturnValue(true)
  };
});

describe('Block Validator', () => {
  // Mock data for testing
  const mockUtxoSet: UTXOSet = {
    'tx1-0': {
      idx: 0,
      nodeId: 'node1',
      value: 10
    }
  };

  // Create transactions with properly calculated txids
  const coinbaseInputs = [{ sourceOutputId: SimulatorConfig.REWARDER_NODE_ID }];
  const coinbaseOutputs = [{ idx: 0, nodeId: 'node1', value: SimulatorConfig.BLOCK_REWARD }];
  const coinbaseTxid = calculateTxid(coinbaseInputs, coinbaseOutputs, 1); // Block height 1
  
  const validCoinbaseTx: Transaction = {
    txid: coinbaseTxid,
    inputs: coinbaseInputs,
    outputs: coinbaseOutputs,
    timestamp: Date.now()
  };

  const regularInputs = [{ sourceOutputId: 'tx1-0' }];
  const regularOutputs = [
    { idx: 0, nodeId: 'node2', value: 5 },
    { idx: 1, nodeId: 'node1', value: 5 }
  ];
  const regularTxid = calculateTxid(regularInputs, regularOutputs, 1); // Block height 1
  
  const validRegularTx: Transaction = {
    txid: regularTxid,
    inputs: regularInputs,
    outputs: regularOutputs,
    timestamp: Date.now()
  };

  const createValidBlock = (previousHash: string, height: number): Block => {
    const transactions = [validCoinbaseTx, validRegularTx];
    // Use the same hash calculation as the actual code
    const transactionHash = hashUtils.sha256Hash(transactions);
    
    const header: BlockHeader = {
      transactionHash,
      timestamp: Date.now(),
      previousHeaderHash: previousHash,
      ceiling: parseInt(SimulatorConfig.CEILING, 16),
      nonce: 123456, // Assume this produces a valid hash
      height
    };
    
    // Calculate the actual hash from the header
    const hash = hashUtils.sha256Hash(header);
    
    return {
      header,
      transactions,
      hash
    };
  };

  it('should validate a valid block', () => {
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: hashUtils.sha256Hash([validCoinbaseTx]),
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: ''
    };
    
    // Set the hash based on the header
    previousBlock.hash = hashUtils.sha256Hash(previousBlock.header);
    
    // Create a valid block with the correct previous hash
    const block = createValidBlock(previousBlock.hash, 1);
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(true);
  });

  it('should reject a block with invalid previous hash', () => {
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: hashUtils.sha256Hash([validCoinbaseTx]),
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: ''
    };
    
    // Set the hash based on the header
    previousBlock.hash = hashUtils.sha256Hash(previousBlock.header);
    
    // Create a block with an invalid previous hash
    const block = createValidBlock('invalid-previous-hash', 1);
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });

  it('should reject a block with no transactions', () => {
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: hashUtils.sha256Hash([validCoinbaseTx]),
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: ''
    };
    
    // Set the hash based on the header
    previousBlock.hash = hashUtils.sha256Hash(previousBlock.header);
    
    // Create a block with no transactions
    const block = createValidBlock(previousBlock.hash, 1);
    block.transactions = [];
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });

  it('should reject a block with no coinbase transaction', () => {
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: hashUtils.sha256Hash([validCoinbaseTx]),
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: ''
    };
    
    // Set the hash based on the header
    previousBlock.hash = hashUtils.sha256Hash(previousBlock.header);
    
    // Create a block with no coinbase transaction
    const block = createValidBlock(previousBlock.hash, 1);
    block.transactions = [validRegularTx]; // Missing coinbase transaction
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });

  it('should reject a block with invalid coinbase transaction', () => {
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: hashUtils.sha256Hash([validCoinbaseTx]),
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: ''
    };
    
    // Set the hash based on the header
    previousBlock.hash = hashUtils.sha256Hash(previousBlock.header);
    
    // Create a block with an invalid coinbase transaction (wrong reward)
    const invalidCoinbaseOutputs = [{ idx: 0, nodeId: 'node1', value: SimulatorConfig.BLOCK_REWARD + 1 }];
    const invalidCoinbaseTxid = calculateTxid(coinbaseInputs, invalidCoinbaseOutputs, 1);
    
    const invalidCoinbaseTx: Transaction = {
      txid: invalidCoinbaseTxid,
      inputs: coinbaseInputs,
      outputs: invalidCoinbaseOutputs,
      timestamp: Date.now()
    };
    
    const block = createValidBlock(previousBlock.hash, 1);
    block.transactions = [invalidCoinbaseTx, validRegularTx];
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });

  it('should reject a block with invalid transaction hash', () => {
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: hashUtils.sha256Hash([validCoinbaseTx]),
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: ''
    };
    
    // Set the hash based on the header
    previousBlock.hash = hashUtils.sha256Hash(previousBlock.header);
    
    // Create a block with an invalid transaction hash
    const block = createValidBlock(previousBlock.hash, 1);
    block.header.transactionHash = 'invalid-transaction-hash';
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });

  it('should reject a block with hash above ceiling', () => {
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: hashUtils.sha256Hash([validCoinbaseTx]),
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: ''
    };
    
    // Set the hash based on the header
    previousBlock.hash = hashUtils.sha256Hash(previousBlock.header);
    
    // Create a block with a hash above ceiling
    const block = createValidBlock(previousBlock.hash, 1);
    
    // Temporarily override the mock to return false for this test
    (hashUtils.isHashBelowCeiling as jest.Mock).mockReturnValueOnce(false);
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    
    expect(result).toBe(false);
  });

  it('should reject a block with future timestamp', () => {
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: hashUtils.sha256Hash([validCoinbaseTx]),
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: ''
    };
    
    // Set the hash based on the header
    previousBlock.hash = hashUtils.sha256Hash(previousBlock.header);
    
    // Create a block with a future timestamp
    const block = createValidBlock(previousBlock.hash, 1);
    
    // Set timestamp to 3 hours in the future (beyond the 2-hour limit)
    const threeHoursInMs = 3 * 60 * 60 * 1000;
    const futureTime = Date.now() + threeHoursInMs;
    block.header.timestamp = futureTime;
    
    // Mock Date.now to return a consistent value
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => futureTime - threeHoursInMs);
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    
    // Restore original Date.now
    Date.now = originalDateNow;
    
    expect(result).toBe(false);
  });

  it('should reject a block with invalid transactions', () => {
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: hashUtils.sha256Hash([validCoinbaseTx]),
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: ''
    };
    
    // Set the hash based on the header
    previousBlock.hash = hashUtils.sha256Hash(previousBlock.header);
    
    // Create an invalid regular transaction (output exceeds input)
    const invalidRegularOutputs = [{ idx: 0, nodeId: 'node2', value: 15 }]; // Total exceeds input value of 10
    const invalidRegularTxid = calculateTxid(regularInputs, invalidRegularOutputs, 1);
    
    const invalidRegularTx: Transaction = {
      txid: invalidRegularTxid,
      inputs: regularInputs,
      outputs: invalidRegularOutputs,
      timestamp: Date.now()
    };
    
    // Create a block with an invalid transaction
    const block = createValidBlock(previousBlock.hash, 1);
    block.transactions = [validCoinbaseTx, invalidRegularTx];
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });
});
