import { validateTransaction, calculateTxid } from '../../../core/validation/transactionValidator';
import { Transaction, TransactionInput, TransactionOutput } from '../../../types/types';
import { SimulatorConfig } from '../../../config/config';

describe('Transaction Validator', () => {
  // Mock UTXO set for testing
  const mockUtxoSet = {
    'tx1-0': {
      idx: 0,
      nodeId: 'node1',
      value: 10
    },
    'tx2-0': {
      idx: 0,
      nodeId: 'node2',
      value: 5
    }
  };

  describe('calculateTxid', () => {
    it('should generate a consistent transaction ID for the same inputs', () => {
      const inputs: TransactionInput[] = [{ sourceOutputId: 'tx1-0' }];
      const outputs: TransactionOutput[] = [
        { idx: 0, nodeId: 'node2', value: 5 },
        { idx: 1, nodeId: 'node1', value: 5 }
      ];
      const blockHeight = 1;

      const txid1 = calculateTxid(inputs, outputs, blockHeight);
      const txid2 = calculateTxid(inputs, outputs, blockHeight);

      expect(txid1).toBe(txid2);
    });

    it('should generate different IDs for different inputs', () => {
      const inputs1: TransactionInput[] = [{ sourceOutputId: 'tx1-0' }];
      const inputs2: TransactionInput[] = [{ sourceOutputId: 'tx2-0' }];
      const outputs: TransactionOutput[] = [
        { idx: 0, nodeId: 'node2', value: 5 },
        { idx: 1, nodeId: 'node1', value: 5 }
      ];
      const blockHeight = 1;

      const txid1 = calculateTxid(inputs1, outputs, blockHeight);
      const txid2 = calculateTxid(inputs2, outputs, blockHeight);

      expect(txid1).not.toBe(txid2);
    });

    it('should generate different IDs for different block heights', () => {
      const inputs: TransactionInput[] = [{ sourceOutputId: 'tx1-0' }];
      const outputs: TransactionOutput[] = [
        { idx: 0, nodeId: 'node2', value: 5 },
        { idx: 1, nodeId: 'node1', value: 5 }
      ];

      const txid1 = calculateTxid(inputs, outputs, 1);
      const txid2 = calculateTxid(inputs, outputs, 2);

      expect(txid1).not.toBe(txid2);
    });
  });

  describe('validateTransaction', () => {
    // Test for coinbase transactions
    it('should validate a valid coinbase transaction', () => {
      const coinbaseTx: Transaction = {
        inputs: [{ sourceOutputId: SimulatorConfig.REWARDER_NODE_ID }],
        outputs: [{ idx: 0, nodeId: 'node1', value: SimulatorConfig.BLOCK_REWARD }],
        timestamp: Date.now()
      };

      const result = validateTransaction(coinbaseTx, mockUtxoSet, 1, true);
      expect(result).toBe(true);
    });

    it('should reject a coinbase transaction with invalid reward', () => {
      const coinbaseTx: Transaction = {
        inputs: [{ sourceOutputId: SimulatorConfig.REWARDER_NODE_ID }],
        outputs: [{ idx: 0, nodeId: 'node1', value: SimulatorConfig.BLOCK_REWARD + 1 }], // Invalid reward
        timestamp: Date.now()
      };

      const result = validateTransaction(coinbaseTx, mockUtxoSet, 1, true);
      expect(result).toBe(false);
    });

    it('should reject a coinbase transaction with multiple inputs', () => {
      const coinbaseTx: Transaction = {
        inputs: [
          { sourceOutputId: SimulatorConfig.REWARDER_NODE_ID },
          { sourceOutputId: 'tx1-0' } // Invalid second input
        ],
        outputs: [{ idx: 0, nodeId: 'node1', value: SimulatorConfig.BLOCK_REWARD }],
        timestamp: Date.now()
      };

      const result = validateTransaction(coinbaseTx, mockUtxoSet, 1, true);
      expect(result).toBe(false);
    });

    // Test for regular transactions
    it('should validate a valid regular transaction', () => {
      const tx: Transaction = {
        inputs: [{ sourceOutputId: 'tx1-0' }], // 10 BTC input
        outputs: [
          { idx: 0, nodeId: 'node2', value: 6 },
          { idx: 1, nodeId: 'node1', value: 4 }
        ],
        timestamp: Date.now()
      };

      const result = validateTransaction(tx, mockUtxoSet, 1);
      expect(result).toBe(true);
    });

    it('should reject a transaction with inputs not in UTXO set', () => {
      const tx: Transaction = {
        inputs: [{ sourceOutputId: 'nonexistent-0' }],
        outputs: [{ idx: 0, nodeId: 'node2', value: 5 }],
        timestamp: Date.now()
      };

      const result = validateTransaction(tx, mockUtxoSet, 1);
      expect(result).toBe(false);
    });

    it('should reject a transaction with outputs exceeding inputs', () => {
      const tx: Transaction = {
        inputs: [{ sourceOutputId: 'tx1-0' }], // 10 BTC input
        outputs: [
          { idx: 0, nodeId: 'node2', value: 6 },
          { idx: 1, nodeId: 'node1', value: 5 } // Total: 11 BTC, exceeds input
        ],
        timestamp: Date.now()
      };

      const result = validateTransaction(tx, mockUtxoSet, 1);
      expect(result).toBe(false);
    });

    it('should reject a transaction with non-positive output values', () => {
      const tx: Transaction = {
        inputs: [{ sourceOutputId: 'tx1-0' }],
        outputs: [
          { idx: 0, nodeId: 'node2', value: 0 }, // Zero value
          { idx: 1, nodeId: 'node1', value: 10 }
        ],
        timestamp: Date.now()
      };

      const result = validateTransaction(tx, mockUtxoSet, 1);
      expect(result).toBe(false);
    });

    it('should reject a transaction with non-sequential output indices', () => {
      const tx: Transaction = {
        inputs: [{ sourceOutputId: 'tx1-0' }],
        outputs: [
          { idx: 0, nodeId: 'node2', value: 5 },
          { idx: 2, nodeId: 'node1', value: 5 } // Index should be 1
        ],
        timestamp: Date.now()
      };

      const result = validateTransaction(tx, mockUtxoSet, 1);
      expect(result).toBe(false);
    });

    it('should reject a transaction with incorrect txid', () => {
      const inputs = [{ sourceOutputId: 'tx1-0' }];
      const outputs = [
        { idx: 0, nodeId: 'node2', value: 5 },
        { idx: 1, nodeId: 'node1', value: 5 }
      ];
      const blockHeight = 1;
      
      const correctTxid = calculateTxid(inputs, outputs, blockHeight);
      
      const tx: Transaction = {
        inputs,
        outputs,
        txid: 'incorrect-txid', // Incorrect txid
        timestamp: Date.now()
      };

      const result = validateTransaction(tx, mockUtxoSet, blockHeight);
      expect(result).toBe(false);
    });
  });
});
