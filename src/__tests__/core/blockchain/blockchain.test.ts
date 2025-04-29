import { Blockchain } from '../../../core/blockchain/blockchain';
import { Block, Transaction } from '../../../types/types';
import { SimulatorConfig } from '../../../config/config';
import * as blockValidator from '../../../core/validation/blockValidator';
import * as chainValidator from '../../../core/validation/chainValidator';

// Helper function to create a valid block
function createValidNextBlock(blockchain: Blockchain): Block {
  // Get the latest block from the blockchain
  const latestBlock = blockchain.getLatestBlock();
  
  const coinbaseTx: Transaction = {
    txid: 'test-coinbase-txid',
    inputs: [{ sourceOutputId: SimulatorConfig.REWARDER_NODE_ID }],
    outputs: [{ idx: 0, nodeId: 'test-miner', value: SimulatorConfig.BLOCK_REWARD }],
    timestamp: Date.now()
  };
  
  // Create the block with transactions
  const transactions = [coinbaseTx];
  
  // Calculate the actual transaction hash
  const transactionHash = blockValidator.calculateTransactionHash(transactions);
  
  const block = {
    header: {
      height: latestBlock.header.height + 1,
      previousHeaderHash: latestBlock.hash || '',
      timestamp: Date.now(),
      nonce: 0,
      ceiling: parseInt(SimulatorConfig.CEILING, 16),
      transactionHash: transactionHash // Use the calculated hash
    },
    transactions: transactions,
    hash: '0000000000000000000000000000000000000000000000000000000000000001' // Valid hash below ceiling
  };
  
  return block;
}

describe('Blockchain Module', () => {
  let blockchain: Blockchain;
  
  beforeEach(() => {
    blockchain = new Blockchain('test-node');
  });
  
  describe('initialization', () => {
    it('should initialize with a genesis block', () => {
      expect(blockchain.getBlocks().length).toBe(1);
      expect(blockchain.getBlocks()[0].header.height).toBe(0);
      expect(blockchain.getBlocks()[0].header.previousHeaderHash).toBe(SimulatorConfig.GENESIS_PREV_HASH);
    });
    
    it('should initialize with a UTXO set containing genesis block outputs', () => {
      const utxo = blockchain.getUTXOSet();
      const genesisBlock = blockchain.getBlocks()[0];
      const genesisTxid = genesisBlock.transactions[0].txid;
      
      // The UTXO set should contain the output from the genesis block
      expect(utxo[`${genesisTxid}-0`]).toBeDefined();
      expect(utxo[`${genesisTxid}-0`].value).toBe(SimulatorConfig.BLOCK_REWARD);
    });
  });
  
  describe('addBlock', () => {
    
    it('should add a valid block to the chain', () => {
      const initialChainLength = blockchain.getBlocks().length;
      const newBlock = createValidNextBlock(blockchain);
      
      // Mock the validation function to return true
      jest.spyOn(blockValidator, 'validateBlock').mockReturnValue(true);
      
      const result = blockchain.addBlock(newBlock);
      
      expect(result).toBe(true);
      expect(blockchain.getBlocks().length).toBe(initialChainLength + 1);
      expect(blockchain.getBlocks()[initialChainLength]).toEqual(newBlock);
    });
    
    it('should update the UTXO set when adding a block', () => {
      const newBlock = createValidNextBlock(blockchain);
      
      // Mock the validation function to return true
      jest.spyOn(blockValidator, 'validateBlock').mockReturnValue(true);
      
      const initialUtxoSize = Object.keys(blockchain.getUTXOSet()).length;
      
      blockchain.addBlock(newBlock);
      
      const updatedUtxoSize = Object.keys(blockchain.getUTXOSet()).length;
      const coinbaseTxid = newBlock.transactions[0].txid;
      
      // The UTXO set should have the new coinbase output
      expect(updatedUtxoSize).toBeGreaterThan(initialUtxoSize);
      expect(blockchain.getUTXOSet()[`${coinbaseTxid}-0`]).toBeDefined();
      expect(blockchain.getUTXOSet()[`${coinbaseTxid}-0`].value).toBe(SimulatorConfig.BLOCK_REWARD);
    });
    
    it('should reject a block with invalid height', () => {
      const newBlock = createValidNextBlock(blockchain);
      newBlock.header.height = 5; // Invalid height
      
      // Reset the mock to allow actual validation
      jest.spyOn(blockValidator, 'validateBlock').mockRestore();
      
      const result = blockchain.addBlock(newBlock);
      
      expect(result).toBe(false);
      expect(blockchain.getBlocks().length).toBe(1); // Still only genesis block
    });
    
    it('should reject a block with invalid previous hash', () => {
      const newBlock = createValidNextBlock(blockchain);
      newBlock.header.previousHeaderHash = 'invalid-previous-hash';
      
      // Reset the mock to allow actual validation
      jest.spyOn(blockValidator, 'validateBlock').mockRestore();
      
      const result = blockchain.addBlock(newBlock);
      
      expect(result).toBe(false);
      expect(blockchain.getBlocks().length).toBe(1); // Still only genesis block
    });
  });
  
  describe('replaceChain', () => {
    it('should replace the chain with a longer valid chain', () => {
      // Create a new blockchain with a longer chain
      const longerChain = new Blockchain('test-node-2');
      
      // Add a block to make it longer
      const newBlock = createValidNextBlock(longerChain);
      
      // Mock the validation function to return true
      jest.spyOn(blockValidator, 'validateBlock').mockReturnValue(true);
      
      longerChain.addBlock(newBlock);
      
      // Verify the longer chain is indeed longer
      expect(longerChain.getBlocks().length).toBe(2);
      
      // Mock the chain validation function to return true
      jest.spyOn(chainValidator, 'validateChain').mockReturnValue(true);
      
      // Replace the chain
      const result = blockchain.replaceChain(longerChain.getBlocks());
      
      expect(result).toBe(true);
      expect(blockchain.getBlocks().length).toBe(2);
      expect(blockchain.getBlocks()[1].hash).toBe(newBlock.hash);
    });
    
    it('should not replace the chain with a shorter chain', () => {
      // Add a block to the original blockchain to make it longer
      const newBlock = createValidNextBlock(blockchain);
      
      // Mock the validation function to return true
      jest.spyOn(blockValidator, 'validateBlock').mockReturnValue(true);
      
      blockchain.addBlock(newBlock);
      
      // Create a new blockchain with just the genesis block
      const shorterChain = new Blockchain('test-node-3');
      
      // Replace the chain
      const result = blockchain.replaceChain(shorterChain.getBlocks());
      
      expect(result).toBe(false);
      expect(blockchain.getBlocks().length).toBe(2); // Original chain unchanged
    });
    
    it('should not replace the chain with an invalid chain', () => {
      // Create a new blockchain with a longer but invalid chain
      const invalidChain = new Blockchain('test-node-4');
      
      // Add a block to make it longer
      const newBlock = createValidNextBlock(invalidChain);
      
      // Mock the validation function to return true for adding
      jest.spyOn(blockValidator, 'validateBlock').mockReturnValue(true);
      
      invalidChain.addBlock(newBlock);
      
      // Mock the chain validation function to return false for validation during replacement
      jest.spyOn(chainValidator, 'validateChain').mockReturnValue(false);
      
      // Replace the chain
      const result = blockchain.replaceChain(invalidChain.getBlocks());
      
      expect(result).toBe(false);
      expect(blockchain.getBlocks().length).toBe(1); // Original chain unchanged
    });
    
    it('should update the UTXO set when replacing the chain', () => {
      // Create a new blockchain with a longer chain
      const longerChain = new Blockchain('test-node-2');
      
      // Add a block to make it longer
      const newBlock = createValidNextBlock(longerChain);
      
      // Mock the validation function to return true
      jest.spyOn(blockValidator, 'validateBlock').mockReturnValue(true);
      
      longerChain.addBlock(newBlock);
      
      // Get the UTXO set from the longer chain
      const longerChainUtxo = longerChain.getUTXOSet();
      
      // Mock the validation function for the original blockchain
      jest.spyOn(blockchain as any, 'isValidChain').mockReturnValue(true);
      
      // Replace the chain
      blockchain.replaceChain(longerChain.getBlocks());
      
      // The UTXO set should be updated to match the longer chain
      expect(blockchain.getUTXOSet()).toEqual(longerChainUtxo);
    });
  });
  
  // This duplicate helper function is removed to avoid confusion
});
