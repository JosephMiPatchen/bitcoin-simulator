import { NodeWorker } from './nodeWorker';
import { Message } from './messages';
import { SimulatorConfig } from '../config/config';

/**
 * NetworkManager class to manage a network of nodes
 * Simulates a peer-to-peer network by routing messages between nodes
 */
export class NetworkManager {
  private nodes: Map<string, NodeWorker> = new Map();
  private networkTopology: Map<string, string[]> = new Map();
  
  /**
   * Creates a new node in the network
   */
  createNode(nodeId: string): NodeWorker {
    // Create a new node worker
    const nodeWorker = new NodeWorker(nodeId);
    
    // Set up message handling
    nodeWorker.setOnMessage(this.handleNodeMessage.bind(this));
    
    // Add the node to the network
    this.nodes.set(nodeId, nodeWorker);
    
    return nodeWorker;
  }
  
  /**
   * Sets up the network topology
   * Defines which nodes are connected to each other
   */
  setupNetworkTopology(topology: Map<string, string[]>): void {
    this.networkTopology = new Map(topology);
    
    // Set peers for each node
    for (const [nodeId, peerIds] of this.networkTopology.entries()) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.setPeers(peerIds);
      }
    }
  }
  
  /**
   * Creates a fully connected network with the specified number of nodes
   */
  createFullyConnectedNetwork(nodeCount: number): string[] {
    const nodeIds: string[] = [];
    
    // Create the nodes
    for (let i = 0; i < nodeCount; i++) {
      const nodeId = `node-${i}`;
      this.createNode(nodeId);
      nodeIds.push(nodeId);
    }
    
    // Set up the network topology (fully connected)
    const topology = new Map<string, string[]>();
    for (const nodeId of nodeIds) {
      // Each node is connected to all other nodes
      topology.set(nodeId, nodeIds.filter(id => id !== nodeId));
    }
    
    this.setupNetworkTopology(topology);
    
    return nodeIds;
  }
  
  /**
   * Handles a message from a node and routes it to the appropriate recipient(s)
   */
  private handleNodeMessage(message: Message): void {
    // Simulate network delay
    setTimeout(() => {
      this.routeMessage(message);
    }, this.getRandomNetworkDelay());
  }
  
  /**
   * Routes a message to the appropriate recipient(s)
   */
  private routeMessage(message: Message): void {
    // If the message has a specific recipient, send it only to that node
    if (message.toNodeId) {
      const targetNode = this.nodes.get(message.toNodeId);
      if (targetNode) {
        targetNode.handleMessage(message);
      } else {
        console.error(`Target node ${message.toNodeId} not found`);
      }
      return;
    }
    
    // Otherwise, it's a broadcast message - send to all peers of the sender
    const senderPeers = this.networkTopology.get(message.fromNodeId) || [];
    for (const peerId of senderPeers) {
      const peerNode = this.nodes.get(peerId);
      if (peerNode) {
        peerNode.handleMessage(message);
      }
    }
  }
  
  /**
   * Starts mining on all nodes
   */
  startAllMining(): void {
    for (const node of this.nodes.values()) {
      node.startMining();
    }
  }
  
  /**
   * Stops mining on all nodes
   */
  stopAllMining(): void {
    for (const node of this.nodes.values()) {
      node.stopMining();
    }
  }
  
  /**
   * Gets a node by its ID
   */
  getNode(nodeId: string): NodeWorker | undefined {
    return this.nodes.get(nodeId);
  }
  
  /**
   * Gets all nodes in the network
   */
  getAllNodes(): Map<string, NodeWorker> {
    return new Map(this.nodes);
  }
  
  /**
   * Gets the state of all nodes in the network
   */
  getNetworkState(): Record<string, any> {
    const state: Record<string, any> = {};
    
    for (const [nodeId, node] of this.nodes.entries()) {
      state[nodeId] = node.getState();
    }
    
    return state;
  }
  
  /**
   * Simulates periodic height requests between nodes
   * This is a key part of the Nakamoto consensus protocol
   */
  startPeriodicHeightRequests(intervalMs: number = 5000): NodeJS.Timeout {
    // Start a timer to periodically request heights
    return setInterval(() => {
      for (const node of this.nodes.values()) {
        node.requestHeightFromPeers();
      }
    }, intervalMs);
  }
  
  /**
   * Generates a random network delay to simulate network latency
   */
  private getRandomNetworkDelay(): number {
    // Simulate network latency between MIN_DELAY and MAX_DELAY
    const MIN_DELAY = SimulatorConfig.MIN_NETWORK_DELAY_MS || 50;
    const MAX_DELAY = SimulatorConfig.MAX_NETWORK_DELAY_MS || 200;
    
    return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
  }
}
