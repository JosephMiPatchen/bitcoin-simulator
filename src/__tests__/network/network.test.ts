import { NetworkManager } from '../../network/networkManager';
import { SimulatorConfig } from '../../config/config';

describe('Network Communication', () => {
  let networkManager: NetworkManager;
  
  beforeEach(() => {
    // Create a new network manager for each test
    networkManager = new NetworkManager();
    
    // Mock setTimeout to execute immediately for testing
    jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
      if (typeof callback === 'function') callback();
      return 0 as any;
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Network Setup', () => {
    it('should create a fully connected network', () => {
      // Create a network with 4 nodes
      const nodeIds = networkManager.createFullyConnectedNetwork(4);
      
      // Should have created 4 nodes
      expect(nodeIds.length).toBe(4);
      
      // Each node should be connected to all other nodes
      for (const nodeId of nodeIds) {
        const node = networkManager.getNode(nodeId);
        expect(node).toBeDefined();
        
        // Each node should have 3 peers (all other nodes)
        const state = node!.getState();
        expect(state.peerIds.length).toBe(3);
        
        // Should not include itself as a peer
        expect(state.peerIds.includes(nodeId)).toBe(false);
      }
    });
  });
  
  describe('Message Passing', () => {
    it('should route messages between nodes', () => {
      // Create a network with 2 nodes for simplicity
      const nodeIds = networkManager.createFullyConnectedNetwork(2);
      const [node1Id, node2Id] = nodeIds;
      
      // Get the nodes
      const node1 = networkManager.getNode(node1Id)!;
      const node2 = networkManager.getNode(node2Id)!;
      
      // Spy on node2's handleMessage method
      const handleMessageSpy = jest.spyOn(node2, 'handleMessage');
      
      // Mock node1's mining to avoid actual computation
      jest.spyOn(node1, 'startMining').mockImplementation(() => {
        // Simulate mining a block by directly calling the message handler
        const mockBlock = {
          header: {
            height: 1,
            previousHeaderHash: SimulatorConfig.GENESIS_BLOCK_HASH,
            timestamp: Date.now(),
            transactionHash: 'mock-tx-hash',
            nonce: 0,
            ceiling: parseInt(SimulatorConfig.CEILING, 16)
          },
          transactions: [],
          hash: 'mock-block-hash'
        };
        
        // Simulate the node broadcasting a block
        const onMessageCallback = (node1 as any).onMessageCallback;
        if (onMessageCallback) {
          onMessageCallback({
            type: 'BLOCK_ANNOUNCEMENT',
            fromNodeId: node1Id,
            block: mockBlock
          });
        }
      });
      
      // Start mining on node1
      node1.startMining();
      
      // Node2 should have received the block announcement message
      expect(handleMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BLOCK_ANNOUNCEMENT',
          fromNodeId: node1Id
        })
      );
    });
  });
  
  describe('Chain Synchronization', () => {
    it('should request chain when a longer chain is discovered', () => {
      // Create a network with 2 nodes
      const nodeIds = networkManager.createFullyConnectedNetwork(2);
      const [node1Id, node2Id] = nodeIds;
      
      // Get the nodes
      const node1 = networkManager.getNode(node1Id)!;
      const node2 = networkManager.getNode(node2Id)!;
      
      // Spy on node1's requestChain method
      const requestChainSpy = jest.spyOn(node1, 'requestChain');
      
      // Simulate node2 having a longer chain
      // by sending a height response message directly
      const onMessageCallback = (node1 as any).onMessageCallback;
      if (onMessageCallback) {
        onMessageCallback({
          type: 'HEIGHT_RESPONSE',
          fromNodeId: node2Id,
          toNodeId: node1Id,
          height: 10 // Node1 starts with height 0
        });
      }
      
      // Node1 should have requested the chain from node2
      expect(requestChainSpy).toHaveBeenCalledWith(node2Id);
    });
  });
});
