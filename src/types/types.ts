/**
 * Core type definitions for the Bitcoin simulator
 */

export interface TransactionInput {
  sourceOutputId: string;  // Format: "{txid}-{idx}" or "REWARDER_NODE_ID" for coinbase
  sourceNodeId?: string;   // Optional: ID of the node that created this output (for UI purposes)
}

export interface TransactionOutput {
  idx: number;        // Position index in the outputs array
  nodeId: string;     // Recipient node identifier
  value: number;      // BTC amount
}

export interface Transaction {
  txid?: string;      // Hash of inputs + outputs (calculated on creation)
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  timestamp?: number; // When the transaction was created
}

export interface UTXOSet {
  [sourceOutputId: string]: TransactionOutput;
}

export interface BlockHeader { // note: we dont have a field for headers hash, we compute that runtime upon validation to keep process robust
  transactionHash: string;  // SHA256 hash of all transactions
  timestamp: number;        // Local machine time
  previousHeaderHash: string; // Previous block's header hash
  ceiling: number;          // Target threshold value
  nonce: number;            // Value miners adjust to find valid hash
  height: number;           // Block height in the chain
}

export interface Block {
  header: BlockHeader;
  transactions: Transaction[];
  hash?: string;      // Calculated hash of the block header
}

export interface NodeState {
  nodeId: string;
  blockchain: Block[];
  utxo: UTXOSet;
  isMining: boolean;
  peerIds: string[];
}

export interface NetworkMessage {
  type: 'BLOCK_ANNOUNCEMENT' | 'BLOCK_REQUEST' | 'CHAIN_LENGTH_REQUEST' | 'CHAIN_LENGTH_RESPONSE';
  payload: any;
  sender: string;
  recipient: string | 'broadcast';
}
