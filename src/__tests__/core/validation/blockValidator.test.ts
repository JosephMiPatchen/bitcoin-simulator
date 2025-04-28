import { validateBlock } from '../../../core/validation/blockValidator';
import { Block, BlockHeader, Transaction, UTXOSet } from '../../../types/types';
import { SimulatorConfig } from '../../../config/config';
import * as hashUtils from '../../../utils/hashUtils';
import { calculateTxid } from '../../../core/validation/transactionValidator';

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
    const transactionHash = hashUtils.sha256Hash(JSON.stringify(transactions));
    
    const header: BlockHeader = {
      transactionHash,
      timestamp: Date.now(),
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

  it('should validate a valid block', () => {
    const block = createValidBlock(SimulatorConfig.GENESIS_BLOCK_HASH, 1);
    
    // Mock the hash calculation to return a valid hash
    jest.spyOn(global.Math, 'random').mockReturnValue(0.1);
    
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: 'genesis-tx-hash',
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: SimulatorConfig.GENESIS_BLOCK_HASH
    };
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(true);
    
    // Restore Math.random
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('should reject a block with invalid previous hash', () => {
    const block = createValidBlock('invalid-previous-hash', 1);
    
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: 'genesis-tx-hash',
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: SimulatorConfig.GENESIS_BLOCK_HASH
    };
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });

  it('should reject a block with no transactions', () => {
    const block = createValidBlock(SimulatorConfig.GENESIS_BLOCK_HASH, 1);
    block.transactions = [];
    
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: 'genesis-tx-hash',
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: SimulatorConfig.GENESIS_BLOCK_HASH
    };
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });

  it('should reject a block with no coinbase transaction', () => {
    const block = createValidBlock(SimulatorConfig.GENESIS_BLOCK_HASH, 1);
    block.transactions = [validRegularTx]; // Missing coinbase transaction
    
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: 'genesis-tx-hash',
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: SimulatorConfig.GENESIS_BLOCK_HASH
    };
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });

  it('should reject a block with invalid coinbase transaction', () => {
    const block = createValidBlock(SimulatorConfig.GENESIS_BLOCK_HASH, 1);
    
    // Create an invalid coinbase transaction (wrong reward)
    const invalidOutputs = [{ idx: 0, nodeId: 'node1', value: SimulatorConfig.BLOCK_REWARD + 1 }];
    const invalidCoinbaseTxid = calculateTxid(coinbaseInputs, invalidOutputs, 1);
    
    const invalidCoinbaseTx: Transaction = {
      txid: invalidCoinbaseTxid,
      inputs: coinbaseInputs,
      outputs: invalidOutputs,
      timestamp: Date.now()
    };
    
    block.transactions = [invalidCoinbaseTx, validRegularTx];
    
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: 'genesis-tx-hash',
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: SimulatorConfig.GENESIS_BLOCK_HASH
    };
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });

  it('should reject a block with invalid transaction hash', () => {
    const block = createValidBlock(SimulatorConfig.GENESIS_BLOCK_HASH, 1);
    block.header.transactionHash = 'invalid-transaction-hash';
    
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: 'genesis-tx-hash',
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: SimulatorConfig.GENESIS_BLOCK_HASH
    };
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });

  it('should reject a block with hash above ceiling', () => {
    const block = createValidBlock(SimulatorConfig.GENESIS_BLOCK_HASH, 1);
    block.hash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'; // Above ceiling
    
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: 'genesis-tx-hash',
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: SimulatorConfig.GENESIS_BLOCK_HASH
    };
    
    // Mock the isHashBelowCeiling function to return false
    jest.spyOn(hashUtils, 'isHashBelowCeiling').mockReturnValue(false);
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    
    // Restore the original function
    jest.spyOn(hashUtils, 'isHashBelowCeiling').mockRestore();
    
    expect(result).toBe(false);
  });

  it('should reject a block with future timestamp', () => {
    const block = createValidBlock(SimulatorConfig.GENESIS_BLOCK_HASH, 1);
    
    // Set timestamp to 3 hours in the future (beyond the 2-hour limit)
    const threeHoursInMs = 3 * 60 * 60 * 1000;
    const futureTime = Date.now() + threeHoursInMs;
    block.header.timestamp = futureTime;
    
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: 'genesis-tx-hash',
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: SimulatorConfig.GENESIS_BLOCK_HASH
    };
    
    // Mock Date.now to return a consistent value
    const originalDateNow = Date.now;
    Date.now = jest.fn(() => futureTime - threeHoursInMs);
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    
    // Restore original Date.now
    Date.now = originalDateNow;
    
    expect(result).toBe(false);
  });

  it('should reject a block with invalid transactions', () => {
    const block = createValidBlock(SimulatorConfig.GENESIS_BLOCK_HASH, 1);
    
    // Create an invalid regular transaction (output exceeds input)
    const invalidRegularOutputs = [{ idx: 0, nodeId: 'node2', value: 15 }]; // Total exceeds input value of 10
    const invalidRegularTxid = calculateTxid(regularInputs, invalidRegularOutputs, 1);
    
    const invalidRegularTx: Transaction = {
      txid: invalidRegularTxid,
      inputs: regularInputs,
      outputs: invalidRegularOutputs,
      timestamp: Date.now()
    };
    
    block.transactions = [validCoinbaseTx, invalidRegularTx];
    
    // Create a mock previous block
    const previousBlock: Block = {
      header: {
        transactionHash: 'genesis-tx-hash',
        timestamp: Date.now() - 10000,
        previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
        ceiling: parseInt(SimulatorConfig.CEILING, 16),
        nonce: 0,
        height: 0
      },
      transactions: [validCoinbaseTx],
      hash: SimulatorConfig.GENESIS_BLOCK_HASH
    };
    
    const result = validateBlock(block, previousBlock, mockUtxoSet);
    expect(result).toBe(false);
  });
});
