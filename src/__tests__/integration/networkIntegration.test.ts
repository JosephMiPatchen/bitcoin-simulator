import { NetworkManager } from '../../network/networkManager';
import { SimulatorConfig } from '../../config/config';
import { Block } from '../../types/types';

// Increase test timeout for integration tests
jest.setTimeout(30000);

describe('Network Integration Tests', () => {
  let networkManager: NetworkManager;
  let nodeIds: string[];
  let intervalIds: NodeJS.Timeout[] = [];
  
  beforeEach(() => {
    // Create a new network for each test
    networkManager = new NetworkManager();
    nodeIds = networkManager.createFullyConnectedNetwork(3);
    // Reset interval IDs array
    intervalIds = [];
    
    // Override config for faster tests
    SimulatorConfig.MIN_NETWORK_DELAY_MS = 10;
    SimulatorConfig.MAX_NETWORK_DELAY_MS = 50;
  });
  
  afterEach(() => {
    // Clean up all intervals
    intervalIds.forEach(id => clearInterval(id));
    intervalIds = [];
    
    // Stop mining
    networkManager.stopAllMining();
    
    // Add a small delay to allow any pending async operations to complete
    return new Promise(resolve => setTimeout(resolve, 100));
  });
  
  test('should have all nodes initialized with genesis blocks at height 0', async () => {
    // Get the network state
    const networkState = networkManager.getNetworkState();
    
    // Verify that each node has a genesis block at height 0
    Object.values(networkState).forEach(nodeState => {
      // Each node should have at least one block (the genesis block)
      expect(nodeState.blockchain.length).toBeGreaterThanOrEqual(1);
      
      // Each node should have a block at height 0 (genesis block)
      const genesisBlock = nodeState.blockchain.find((block: Block) => block.header.height === 0);
      expect(genesisBlock).toBeDefined();
      
      // Genesis block should have at least one transaction (the coinbase)
      expect(genesisBlock?.transactions.length).toBeGreaterThanOrEqual(1);
    });
    
    // Note: In our simulator, each node creates its own genesis block.
    // This creates an initial "forked" state across the network,
    // which demonstrates how Nakamoto consensus resolves inconsistencies
    // when nodes start from different initial states.
  });
  
  test('should perform height requests between nodes', async () => {
    // Create a spy on the NodeWorker's requestHeight method to track calls
    const nodeIds = Array.from(networkManager.nodes.keys());
    const firstNode = networkManager.nodes.get(nodeIds[0]);
    
    // Create spies on key methods
    const requestHeightSpy = jest.spyOn(firstNode!, 'requestHeight');
    const handleHeightRequestSpy = jest.spyOn(firstNode as any, 'handleHeightRequest');
    const handleHeightResponseSpy = jest.spyOn(firstNode as any, 'handleHeightResponse');
    
    // Start periodic height requests to trigger chain synchronization
    const intervalId = networkManager.startPeriodicHeightRequests(100); // Use shorter interval for testing
    intervalIds.push(intervalId); // Track the interval ID for cleanup
    
    // Wait for height requests to occur
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify that height request methods were called
    expect(requestHeightSpy).toHaveBeenCalled();
    
    // If we have at least two nodes, verify that height request/response handlers were called
    // This confirms the full height request/response cycle is working
    if (nodeIds.length > 1) {
      // Wait a bit more for responses to be processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Either handleHeightRequest or handleHeightResponse should have been called
      // depending on which node initiated the request first
      const heightMessagesProcessed = 
        handleHeightRequestSpy.mock.calls.length > 0 || 
        handleHeightResponseSpy.mock.calls.length > 0;
      
      expect(heightMessagesProcessed).toBe(true);
    }
    
    // Clean up spies
    requestHeightSpy.mockRestore();
    handleHeightRequestSpy.mockRestore();
    handleHeightResponseSpy.mockRestore();
  });
  
  test('should verify genesis blocks have different outputs', () => {
    // Get the network state to verify genesis blocks
    const networkState = networkManager.getNetworkState();
    const nodeIds = Object.keys(networkState);
    
    // Collect all genesis block output recipients
    const outputRecipients = new Set<string>();
    
    // Verify each node has its own genesis block with self-rewarding coinbase
    Object.entries(networkState).forEach(([nodeId, state]) => {
      // Find the genesis block (height 0)
      const genesisBlock = state.blockchain.find((block: Block) => block.header.height === 0);
      expect(genesisBlock).toBeDefined();
      
      // Verify the coinbase transaction rewards the node itself
      const coinbaseTransaction = genesisBlock?.transactions[0];
      const selfRewardOutput = coinbaseTransaction?.outputs.find(
        (output: any) => output.nodeId === nodeId
      );
      
      // Add this recipient to our set
      if (selfRewardOutput?.nodeId) {
        outputRecipients.add(selfRewardOutput.nodeId);
      }
      
      // The previousHeaderHash should be the configured genesis previous hash (all zeros)
      expect(genesisBlock.header.previousHeaderHash).toBe(SimulatorConfig.GENESIS_PREV_HASH);
      
      // Verify the reward amount matches the configured block reward
      expect(selfRewardOutput?.value).toBe(SimulatorConfig.BLOCK_REWARD);
      
      // Verify the UTXO set contains this output
      const outputId = `${coinbaseTransaction?.txid}-${selfRewardOutput?.idx}`;
      expect(state.utxo[outputId]).toBeDefined();
    });
    
    // Each node should have a different recipient (itself) in its genesis block
    expect(outputRecipients.size).toBe(nodeIds.length);
  });
  
  test('should verify genesis block convergence after mining to at least 4 blocks', async () => {
    // For faster testing, reduce network delays
    SimulatorConfig.MIN_NETWORK_DELAY_MS = 10;
    SimulatorConfig.MAX_NETWORK_DELAY_MS = 50;
    
    // Start mining on all nodes
    networkManager.startAllMining();
    
    // Start periodic height requests to help nodes discover the longest chain
    // Use a more frequent interval to help with convergence
    const intervalId = networkManager.startPeriodicHeightRequests(100);
    intervalIds.push(intervalId); // Track the interval ID for cleanup
    
    // Wait for chains to reach at least 4 blocks in length
    const targetLength = 4;
    let allChainsReachedTarget = false;
    
    // Set a timeout for the test (60 seconds)
    const maxWaitTime = 60000;
    const startTime = Date.now();
    
    // Poll until all nodes have at least 4 blocks
    while (!allChainsReachedTarget && Date.now() - startTime < maxWaitTime) {
      // Get current network state
      const currentState = networkManager.getNetworkState();
      
      // Check if all nodes have reached the target chain length
      allChainsReachedTarget = Object.values(currentState).every(state => 
        state.blockchain.length >= targetLength
      );
      
      if (allChainsReachedTarget) {
        console.log(`All nodes have reached at least ${targetLength} blocks after ${(Date.now() - startTime) / 1000} seconds`);
        break;
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Stop mining
    networkManager.stopAllMining();
    
    // Get the final network state
    const finalState = networkManager.getNetworkState();
    
    // Log the chain lengths for debugging
    Object.entries(finalState).forEach(([nodeId, state]) => {
      console.log(`Node ${nodeId} has ${state.blockchain.length} blocks`);
    });
    
    // Verify all nodes have reached the target chain length
    Object.values(finalState).forEach(state => {
      expect(state.blockchain.length).toBeGreaterThanOrEqual(targetLength);
    });
    
    // Verify that height 0 (genesis blocks) still has different hashes
    const genesisBlockHashes = new Set<string>();
    
    Object.entries(finalState).forEach(([nodeId, state]) => {
      const genesisBlock = state.blockchain.find((b: Block) => b.header.height === 0);
      if (genesisBlock?.hash) {
        genesisBlockHashes.add(genesisBlock.hash);
        console.log(`Node ${nodeId} genesis block hash: ${genesisBlock.hash}`);
      }
    });
    
    // Each node should still have its own unique genesis block
    expect(genesisBlockHashes.size).toBe(Object.keys(finalState).length);
  });
});
