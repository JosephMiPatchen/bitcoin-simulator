import { Transaction } from '../../types/types';
import { SimulatorConfig } from '../../config/config';
import { calculateTxid } from '../validation/transactionValidator';

/**
 * Creates a coinbase transaction for the given miner and block height
 */
export const createCoinbaseTransaction = (
  minerNodeId: string, 
  blockHeight: number
): Transaction => {
  const inputs = [{ sourceOutputId: SimulatorConfig.REWARDER_NODE_ID }];
  const outputs = [{ 
    idx: 0, 
    nodeId: minerNodeId, 
    value: SimulatorConfig.BLOCK_REWARD 
  }];
  
  return {
    inputs,
    outputs,
    timestamp: Date.now(),
    txid: calculateTxid(inputs, outputs, blockHeight)
  };
};

/**
 * Creates a transaction that redistributes a portion of the coinbase reward to peers
 */
export const createRedistributionTransaction = (
  coinbaseTxid: string,
  minerNodeId: string,
  peerNodeIds: string[],
  blockHeight: number
): Transaction => {
  // Calculate redistribution amounts
  const redistributionAmount = SimulatorConfig.BLOCK_REWARD * SimulatorConfig.REDISTRIBUTION_RATIO;
  const amountPerPeer = redistributionAmount / peerNodeIds.length;
  
  // Create input referencing the coinbase output
  const inputs = [{ sourceOutputId: `${coinbaseTxid}-0` }];
  
  // Create outputs for each peer and change back to miner
  const outputs = [
    ...peerNodeIds.map((nodeId, idx) => ({
      idx,
      nodeId,
      value: amountPerPeer
    })),
    {
      idx: peerNodeIds.length,
      nodeId: minerNodeId,
      value: SimulatorConfig.BLOCK_REWARD - redistributionAmount
    }
  ];
  
  return {
    inputs,
    outputs,
    timestamp: Date.now(),
    txid: calculateTxid(inputs, outputs, blockHeight)
  };
};
