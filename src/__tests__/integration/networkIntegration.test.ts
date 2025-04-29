import { NetworkManager } from '../../network/networkManager';
import { SimulatorConfig } from '../../config/config';
import { Block } from '../../types/types';

// Increase test timeout for integration tests
jest.setTimeout(30000);

describe('Network Integration Tests', () => {
  let networkManager: NetworkManager;
  
  beforeEach(() => {
    // Override config for faster tests
    SimulatorConfig.MIN_NETWORK_DELAY_MS = 10;
    SimulatorConfig.MAX_NETWORK_DELAY_MS = 50;
    
    // Create a network with 3 nodes
    networkManager = NetworkManager.createFullyConnectedNetwork(3);
  });
  
  afterEach(() => {
    // Clean up
    networkManager.stopAllNodes();
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
    // Get network manager
    
    // Start periodic height requests to trigger chain synchronization
    const intervalId = networkManager.startPeriodicHeightRequests(500);
    
    // Wait for height requests to occur
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Stop periodic height requests
    clearInterval(intervalId);
    
    // Get the network state
    const networkState = networkManager.getNetworkState();
    
    // Verify that all nodes have blockchain data
    Object.values(networkState).forEach(nodeState => {
      expect(nodeState.blockchain).toBeDefined();
      expect(Array.isArray(nodeState.blockchain)).toBe(true);
    });
    
    // Verify that all nodes have at least a genesis block
    const allHaveGenesisBlock = Object.values(networkState).every(nodeState => 
      nodeState.blockchain.some((block: Block) => block.header.height === 0)
    );
    
    expect(allHaveGenesisBlock).toBe(true);
  });
  
  test('should handle network partitions and reconcile when reconnected', async () => {
    // Create two separate networks
    const network1 = NetworkManager.createFullyConnectedNetwork(2);
    const network2 = NetworkManager.createFullyConnectedNetwork(2);
    
    // Start mining on both networks
    network1.startAllMining();
    network2.startAllMining();
    
    // Let them mine independently
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Stop mining
    network1.stopAllMining();
    network2.stopAllMining();
    
    // Get states before merging
    const state1 = network1.getNetworkState();
    const state2 = network2.getNetworkState();
    
    // Get the longest chain from each network
    const height1 = Math.max(...Object.values(state1).map(s => s.blockchain.length));
    const height2 = Math.max(...Object.values(state2).map(s => s.blockchain.length));
    
    // Create a merged network
    const mergedNetwork = new NetworkManager();
    
    // Add all nodes from both networks to the merged network
    [...network1.nodes.entries(), ...network2.nodes.entries()].forEach(([nodeId, nodeWorker]) => {
      mergedNetwork.addNode(nodeId, nodeWorker);
      
      // Connect each node to all other nodes
      const allNodeIds = [...network1.nodes.keys(), ...network2.nodes.keys()];
      const otherNodeIds = allNodeIds.filter(id => id !== nodeId);
      nodeWorker.setPeers(otherNodeIds);
    });
    
    // Start periodic height requests to trigger chain synchronization
    const intervalId = mergedNetwork.startPeriodicHeightRequests(500);
    
    // Wait for synchronization to occur
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Stop periodic height requests
    clearInterval(intervalId);
    
    // Get the merged network state
    const mergedState = mergedNetwork.getNetworkState();
    
    // All nodes should converge to the longest chain
    const finalHeights = Object.values(mergedState).map(s => s.blockchain.length);
    const finalMaxHeight = Math.max(...finalHeights);
    
    // The final height should be at least as high as the highest pre-merge height
    expect(finalMaxHeight).toBeGreaterThanOrEqual(Math.max(height1, height2));
    
    // All nodes should have the same height
    expect(new Set(finalHeights).size).toBe(1);
    
    // Clean up
    network1.stopAllNodes();
    network2.stopAllNodes();
    mergedNetwork.stopAllNodes();
  });
  
  test('should handle forks and converge to the longest valid chain', async () => {
    // Create a network with 4 nodes
    const largerNetwork = NetworkManager.createFullyConnectedNetwork(4);
    
    // Start mining on all nodes
    largerNetwork.nodes.forEach(node => node.startMining());
    
    // Wait for some blocks to be mined
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    // Stop mining
    largerNetwork.nodes.forEach(node => node.stopMining());
    
    // Start periodic height requests
    const intervalId = largerNetwork.startPeriodicHeightRequests(500);
    
    // Wait for synchronization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Stop periodic height requests
    clearInterval(intervalId);
    
    // Get the network state
    const networkState = largerNetwork.getNetworkState();
    
    // Check that all nodes have converged to the same blockchain height
    const heights = Object.values(networkState).map(nodeState => nodeState.blockchain.length);
    expect(new Set(heights).size).toBe(1); // All heights should be the same
    
    // Check that all nodes have the same blockchain hash at each height
    const blocksByHeight: Record<number, Set<string>> = {};
    
    Object.values(networkState).forEach(nodeState => {
      nodeState.blockchain.forEach((block: Block) => {
        const heightNum = block.header.height;
        if (!blocksByHeight[heightNum]) {
          blocksByHeight[heightNum] = new Set<string>();
        }
        blocksByHeight[heightNum].add(block.hash || '');
      });
    });
    
    // For each height, there should be exactly one block hash (all nodes agree)
    Object.entries(blocksByHeight).forEach(([_, hashes]) => {
      expect(hashes.size).toBe(1);
    });
    
    // Clean up
    largerNetwork.stopAllNodes();
  });
});
