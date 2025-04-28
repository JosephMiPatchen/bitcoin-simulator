import { Miner } from '../../../core/mining/miner';
import { Block } from '../../../types/types';
import { SimulatorConfig } from '../../../config/config';

describe('Miner Module', () => {
  let miner: Miner;
  const nodeId = 'test-node';
  const peerIds = ['peer1', 'peer2', 'peer3'];
  let blockMinedCallback: jest.Mock;
  
  beforeEach(() => {
    blockMinedCallback = jest.fn();
    miner = new Miner(nodeId, blockMinedCallback);
    miner.setPeerIds(peerIds);
    
    // Mock the hash calculation to make mining deterministic
    jest.spyOn(global.Math, 'random').mockReturnValue(0.1);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('initialization', () => {
    it('should initialize with correct properties', () => {
      expect(miner.getIsMining()).toBe(false);
    });
  });
  
  describe('createBlockTransactions', () => {
    it('should create a coinbase transaction and redistribution transaction', () => {
      const height = 1;
      const transactions = (miner as any).createBlockTransactions(height);
      
      // Should have 2 transactions
      expect(transactions.length).toBe(2);
      
      // First transaction should be coinbase
      const coinbaseTx = transactions[0];
      expect(coinbaseTx.inputs[0].sourceOutputId).toBe(SimulatorConfig.REWARDER_NODE_ID);
      expect(coinbaseTx.outputs[0].nodeId).toBe(nodeId);
      expect(coinbaseTx.outputs[0].value).toBe(SimulatorConfig.BLOCK_REWARD);
      
      // Second transaction should redistribute coins
      const redistributionTx = transactions[1];
      expect(redistributionTx.inputs[0].sourceOutputId).toBe(`${coinbaseTx.txid}-0`);
      
      // Should have outputs for each peer plus change back to miner
      expect(redistributionTx.outputs.length).toBe(peerIds.length + 1);
      
      // Check peer outputs
      const redistributionAmount = (SimulatorConfig.BLOCK_REWARD * SimulatorConfig.REDISTRIBUTION_PERCENTAGE) / 100;
      const amountPerPeer = redistributionAmount / peerIds.length;
      
      for (let i = 0; i < peerIds.length; i++) {
        expect(redistributionTx.outputs[i].nodeId).toBe(peerIds[i]);
        expect(redistributionTx.outputs[i].value).toBeCloseTo(amountPerPeer);
      }
      
      // Check change output
      const changeOutput = redistributionTx.outputs[peerIds.length];
      expect(changeOutput.nodeId).toBe(nodeId);
      expect(changeOutput.value).toBeCloseTo(SimulatorConfig.BLOCK_REWARD - redistributionAmount);
    });
  });
  
  describe('startMining', () => {
    it('should start the mining process', () => {
      // Mock the mining process to avoid actual computation
      jest.spyOn(miner as any, 'mineBlock').mockImplementation(() => {});
      
      // Create a mock previous block
      const previousBlock: Block = {
        header: {
          transactionHash: 'test-tx-hash',
          timestamp: Date.now(),
          previousHeaderHash: 'test-previous-hash',
          ceiling: parseInt(SimulatorConfig.CEILING, 16),
          nonce: 0,
          height: 0
        },
        transactions: [],
        hash: 'test-hash'
      };
      
      miner.startMining(previousBlock);
      
      expect(miner.getIsMining()).toBe(true);
      expect((miner as any).mineBlock).toHaveBeenCalled();
    });
    
    it('should not start mining if already mining', () => {
      // Mock the mining process to avoid actual computation
      jest.spyOn(miner as any, 'mineBlock').mockImplementation(() => {});
      
      // Create a mock previous block
      const previousBlock: Block = {
        header: {
          transactionHash: 'test-tx-hash',
          timestamp: Date.now(),
          previousHeaderHash: 'test-previous-hash',
          ceiling: parseInt(SimulatorConfig.CEILING, 16),
          nonce: 0,
          height: 0
        },
        transactions: [],
        hash: 'test-hash'
      };
      
      // Start mining once
      miner.startMining(previousBlock);
      
      // Reset the mock to check if it's called again
      ((miner as any).mineBlock as jest.Mock).mockClear();
      
      // Try to start mining again
      miner.startMining(previousBlock);
      
      // Should not call mineBlock again
      expect((miner as any).mineBlock).not.toHaveBeenCalled();
    });
  });
  
  describe('stopMining', () => {
    it('should stop the mining process', () => {
      // Mock the mining process to avoid actual computation
      jest.spyOn(miner as any, 'mineBlock').mockImplementation(() => {});
      
      // Create a mock previous block
      const previousBlock: Block = {
        header: {
          transactionHash: 'test-tx-hash',
          timestamp: Date.now(),
          previousHeaderHash: 'test-previous-hash',
          ceiling: parseInt(SimulatorConfig.CEILING, 16),
          nonce: 0,
          height: 0
        },
        transactions: [],
        hash: 'test-hash'
      };
      
      // Start mining
      miner.startMining(previousBlock);
      
      // Stop mining
      miner.stopMining();
      
      expect(miner.getIsMining()).toBe(false);
    });
  });
  
  describe('handleMinedBlock', () => {
    it('should process a successfully mined block', () => {
      // Create a mock block
      const block: Block = {
        header: {
          transactionHash: 'test-tx-hash',
          timestamp: Date.now(),
          previousHeaderHash: 'test-previous-hash',
          ceiling: parseInt(SimulatorConfig.CEILING, 16),
          nonce: 123,
          height: 1
        },
        transactions: [],
        hash: 'test-block-hash'
      };
      
      // Set mining to true so we can verify it's set to false
      (miner as any).isMining = true;
      
      // Handle the mined block
      (miner as any).handleMinedBlock(block);
      
      // Should call the callback
      expect(blockMinedCallback).toHaveBeenCalledWith(block);
      
      // Should stop mining
      expect(miner.getIsMining()).toBe(false);
    });
  });
  
  describe('mineBlock', () => {
    it('should find a valid block hash', () => {
      // Mock the hash calculation to return a valid hash on the first try
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') callback();
        return 0 as any;
      });
      
      // Mock calculateBlockHeaderHash to return a valid hash
      const validHash = '0000000000000000000000000000000000000000000000000000000000000001';
      jest.spyOn(require('../../../core/validation/blockValidator'), 'calculateBlockHeaderHash')
        .mockReturnValue(validHash);
      
      // Mock isHashBelowCeiling to return true
      jest.spyOn(require('../../../utils/hashUtils'), 'isHashBelowCeiling')
        .mockReturnValue(true);
      
      // Create a mock block
      const block: Block = {
        header: {
          transactionHash: 'test-tx-hash',
          timestamp: Date.now(),
          previousHeaderHash: 'test-previous-hash',
          ceiling: parseInt(SimulatorConfig.CEILING, 16),
          nonce: 0,
          height: 1
        },
        transactions: []
      };
      
      // Set mining to true
      (miner as any).isMining = true;
      
      // Mine the block
      (miner as any).mineBlock(block, 'test-previous-hash');
      
      // Should have called handleMinedBlock with the block
      expect(blockMinedCallback).toHaveBeenCalledWith({
        ...block,
        hash: validHash
      });
      
      // Restore mocks
      jest.restoreAllMocks();
    });
    
    it('should stop mining if previous block changes', () => {
      // Mock setTimeout to execute callback immediately
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        if (typeof callback === 'function') callback();
        return 0 as any;
      });
      
      // Mock calculateBlockHeaderHash
      jest.spyOn(require('../../../core/validation/blockValidator'), 'calculateBlockHeaderHash')
        .mockReturnValue('test-hash');
      
      // Mock isHashBelowCeiling to return false (no valid hash found)
      jest.spyOn(require('../../../utils/hashUtils'), 'isHashBelowCeiling')
        .mockReturnValue(false);
      
      // Create a mock block with a different previous hash than expected
      const block: Block = {
        header: {
          transactionHash: 'test-tx-hash',
          timestamp: Date.now(),
          previousHeaderHash: 'actual-previous-hash', // Different from expected
          ceiling: parseInt(SimulatorConfig.CEILING, 16),
          nonce: 0,
          height: 1
        },
        transactions: []
      };
      
      // Set mining to true
      (miner as any).isMining = true;
      
      // Spy on stopMining
      jest.spyOn(miner, 'stopMining');
      
      // Mine the block with a different expected previous hash
      (miner as any).mineBlock(block, 'expected-previous-hash');
      
      // Should have called stopMining
      expect(miner.stopMining).toHaveBeenCalled();
      
      // Restore mocks
      jest.restoreAllMocks();
    });
  });
});
