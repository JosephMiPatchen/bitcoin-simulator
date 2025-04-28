import { Block, Transaction, TransactionOutput, UTXOSet } from '../../types/types';

/**
 * Updates the UTXO set with a new transaction
 * Removes spent outputs and adds new outputs
 */
export const updateUTXOSet = (
  utxoSet: UTXOSet,
  transaction: Transaction
): UTXOSet => {
  const newUtxoSet = { ...utxoSet };
  
  // Validate that all non-coinbase inputs exist in the UTXO set
  const isCoinbase = transaction.inputs.length === 1 && 
                    transaction.inputs[0].sourceOutputId === 'COINBASE-REWARD';
  
  if (!isCoinbase) {
    // Check if all inputs exist in the UTXO set
    const allInputsExist = transaction.inputs.every(input => 
      input.sourceOutputId === 'COINBASE-REWARD' || utxoSet[input.sourceOutputId] !== undefined
    );
    
    // If any input doesn't exist, return the original UTXO set unchanged
    if (!allInputsExist) {
      return utxoSet;
    }
  }
  
  // Remove spent outputs from UTXO set
  for (const input of transaction.inputs) {
    // Skip coinbase inputs as they don't reference existing UTXOs
    if (input.sourceOutputId !== 'COINBASE-REWARD') {
      delete newUtxoSet[input.sourceOutputId];
    }
  }
  
  // Add new outputs to UTXO set
  if (transaction.txid) {
    for (const output of transaction.outputs) {
      const outputId = `${transaction.txid}-${output.idx}`;
      newUtxoSet[outputId] = output;
    }
  }
  
  return newUtxoSet;
};

/**
 * Rebuilds the UTXO set from blocks
 * This is used when switching to a new chain
 */
export const rebuildUTXOSetFromBlocks = (blocks: Block[]): UTXOSet => {
  // Extract all transactions from blocks
  const transactions = blocks.flatMap(block => block.transactions);
  return rebuildUTXOSetFromTransactions(transactions);
};

/**
 * Rebuilds the UTXO set from transactions
 * This is used when switching to a new chain
 */
export const rebuildUTXOSetFromTransactions = (transactions: Transaction[]): UTXOSet => {
  const utxoSet: UTXOSet = {};
  
  // Process transactions in order
  for (const transaction of transactions) {
    // Skip transactions without txid
    if (!transaction.txid) continue;
    
    // Remove spent outputs
    for (const input of transaction.inputs) {
      // Skip coinbase inputs
      if (input.sourceOutputId !== 'COINBASE-REWARD') {
        delete utxoSet[input.sourceOutputId];
      }
    }
    
    // Add new outputs
    for (const output of transaction.outputs) {
      const outputId = `${transaction.txid}-${output.idx}`;
      utxoSet[outputId] = output;
    }
  }
  
  return utxoSet;
};

/**
 * Rebuilds the UTXO set from a blockchain
 * This is used when switching to a new chain
 * @deprecated Use rebuildUTXOSetFromBlocks instead
 */
export const rebuildUTXOSet = (transactions: Transaction[]): UTXOSet => {
  return rebuildUTXOSetFromTransactions(transactions);
};

/**
 * Gets all UTXOs belonging to a specific node
 */
export const getNodeUTXOs = (
  utxoSet: UTXOSet,
  nodeId: string
): { [outputId: string]: TransactionOutput } => {
  const nodeUtxos: { [outputId: string]: TransactionOutput } = {};
  
  for (const [outputId, output] of Object.entries(utxoSet)) {
    if (output.nodeId === nodeId) {
      nodeUtxos[outputId] = output;
    }
  }
  
  return nodeUtxos;
};

/**
 * Calculates the total balance for a node from the UTXO set
 */
export const calculateNodeBalance = (
  utxoSet: UTXOSet,
  nodeId: string
): number => {
  let balance = 0;
  
  for (const output of Object.values(utxoSet)) {
    if (output.nodeId === nodeId) {
      balance += output.value;
    }
  }
  
  return balance;
};
