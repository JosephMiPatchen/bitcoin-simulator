/**
 * Configuration system for the Bitcoin simulator
 * Contains parameters that can be easily adjusted
 */

export const SimulatorConfig = {
  // Mining parameters
  BLOCK_REWARD: 4,           // BTC rewarded to miners
  CEILING: "0x01000000000000000000000000000000000000000000000000000000000000000",  // Target difficulty 1/256
  
  // Network parameters
  NODE_COUNT: 4,             // Number of nodes in the network
  
  // Transaction parameters
  REDISTRIBUTION_RATIO: 0.5, // Ratio of coins to redistribute (0-1)
  
  // Constants
  REWARDER_NODE_ID: "COINBASE-REWARD",
  GENESIS_BLOCK_HASH: "0000000000000000000000000000000000000000000000000000000000000000",
  
  // UI parameters
  MINING_BATCH_SIZE: 1000,   // Number of hash attempts per batch
  UPDATE_INTERVAL_MS: 500,   // UI update interval in milliseconds
};
