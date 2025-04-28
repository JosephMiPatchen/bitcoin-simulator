import { createCoinbaseTransaction, createRedistributionTransaction } from '../../../core/blockchain/transaction';
import { SimulatorConfig } from '../../../config/config';

describe('Transaction Module', () => {
  describe('createCoinbaseTransaction', () => {
    it('should create a valid coinbase transaction', () => {
      const minerNodeId = 'node1';
      const blockHeight = 1;
      
      const transaction = createCoinbaseTransaction(minerNodeId, blockHeight);
      
      // Check structure
      expect(transaction).toBeDefined();
      expect(transaction.inputs).toHaveLength(1);
      expect(transaction.outputs).toHaveLength(1);
      expect(transaction.txid).toBeDefined();
      expect(transaction.timestamp).toBeDefined();
      
      // Check input
      expect(transaction.inputs[0].sourceOutputId).toBe(SimulatorConfig.REWARDER_NODE_ID);
      
      // Check output
      expect(transaction.outputs[0].idx).toBe(0);
      expect(transaction.outputs[0].nodeId).toBe(minerNodeId);
      expect(transaction.outputs[0].value).toBe(SimulatorConfig.BLOCK_REWARD);
    });
    
    it('should create different transactions for different block heights', () => {
      const minerNodeId = 'node1';
      
      const transaction1 = createCoinbaseTransaction(minerNodeId, 1);
      const transaction2 = createCoinbaseTransaction(minerNodeId, 2);
      
      expect(transaction1.txid).not.toBe(transaction2.txid);
    });
    
    it('should create different transactions for different miners', () => {
      const blockHeight = 1;
      
      const transaction1 = createCoinbaseTransaction('node1', blockHeight);
      const transaction2 = createCoinbaseTransaction('node2', blockHeight);
      
      expect(transaction1.txid).not.toBe(transaction2.txid);
      expect(transaction1.outputs[0].nodeId).toBe('node1');
      expect(transaction2.outputs[0].nodeId).toBe('node2');
    });
  });
  
  describe('createRedistributionTransaction', () => {
    
    it('should create a valid redistribution transaction', () => {
      const coinbaseTxid = 'test-coinbase-txid';
      const minerNodeId = 'node1';
      const peerNodeIds = ['node2', 'node3'];
      const blockHeight = 1;
      
      const transaction = createRedistributionTransaction(coinbaseTxid, minerNodeId, peerNodeIds, blockHeight);
      
      // Check structure
      expect(transaction).toBeDefined();
      expect(transaction.inputs).toHaveLength(1);
      expect(transaction.inputs[0].sourceOutputId).toBe(`${coinbaseTxid}-0`);
      expect(transaction.outputs).toHaveLength(peerNodeIds.length + 1); // Peers + change
      expect(transaction.txid).toBeDefined();
      expect(transaction.timestamp).toBeDefined();
    });
    
    it('should create different transactions for different coinbase txids', () => {
      const coinbaseTxid1 = 'test-coinbase-txid-1';
      const coinbaseTxid2 = 'test-coinbase-txid-2';
      const minerNodeId = 'node1';
      const peerNodeIds = ['node2', 'node3'];
      const blockHeight = 1;
      
      const transaction1 = createRedistributionTransaction(coinbaseTxid1, minerNodeId, peerNodeIds, blockHeight);
      const transaction2 = createRedistributionTransaction(coinbaseTxid2, minerNodeId, peerNodeIds, blockHeight);
      
      expect(transaction1.txid).not.toBe(transaction2.txid);
    });
    
    it('should create different transactions for different block heights', () => {
      const coinbaseTxid = 'test-coinbase-txid';
      const minerNodeId = 'node1';
      const peerNodeIds = ['node2', 'node3'];
      
      const transaction1 = createRedistributionTransaction(coinbaseTxid, minerNodeId, peerNodeIds, 1);
      const transaction2 = createRedistributionTransaction(coinbaseTxid, minerNodeId, peerNodeIds, 2);
      
      expect(transaction1.txid).not.toBe(transaction2.txid);
    });
    
    it('should distribute the correct amounts to peers', () => {
      const coinbaseTxid = 'test-coinbase-txid';
      const minerNodeId = 'node1';
      const peerNodeIds = ['node2', 'node3'];
      const blockHeight = 1;
      
      const transaction = createRedistributionTransaction(coinbaseTxid, minerNodeId, peerNodeIds, blockHeight);
      
      // Calculate expected values
      const redistributionAmount = (SimulatorConfig.BLOCK_REWARD * SimulatorConfig.REDISTRIBUTION_PERCENTAGE) / 100;
      const amountPerPeer = redistributionAmount / peerNodeIds.length;
      
      // Check peer outputs
      for (let i = 0; i < peerNodeIds.length; i++) {
        expect(transaction.outputs[i].nodeId).toBe(peerNodeIds[i]);
        expect(transaction.outputs[i].value).toBeCloseTo(amountPerPeer);
      }
      
      // Check change output
      const changeOutput = transaction.outputs[peerNodeIds.length];
      expect(changeOutput.nodeId).toBe(minerNodeId);
      expect(changeOutput.value).toBeCloseTo(SimulatorConfig.BLOCK_REWARD - redistributionAmount);
    });
  });
});
