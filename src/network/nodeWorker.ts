import { Node } from '../core/node';
import { Block } from '../types/types';
import { 
  Message, 
  MessageType, 
  BlockAnnouncementMessage,
  ChainRequestMessage,
  ChainResponseMessage,
  HeightRequestMessage,
  HeightResponseMessage
} from './messages';

/**
 * NodeWorker class that wraps a Node instance and handles message passing
 * This simulates a node running in its own process/thread
 */
export class NodeWorker {
  private node: Node;
  private onOutgoingMessageCallback?: (message: Message) => void;
  
  constructor(nodeId: string) {
    // Create the node instance
    this.node = new Node(nodeId);
    
    // Set up callback for block broadcast events
    this.node.setOnBlockBroadcast(this.handleBlockBroadcast.bind(this));
  }
  
  /**
   * Sets the callback for when this node needs to send a message to other nodes
   * This is called by the NetworkManager to establish the outgoing message channel
   */
  setOnOutgoingMessage(callback: (message: Message) => void): void {
    this.onOutgoingMessageCallback = callback;
  }
  
  /**
   * Receives and processes incoming messages from other nodes via the network
   */
  receiveIncomingMessage(message: Message): void {
    switch (message.type) {
      case MessageType.BLOCK_ANNOUNCEMENT:
        this.handleBlockAnnouncement(message as BlockAnnouncementMessage);
        break;
      case MessageType.CHAIN_REQUEST:
        this.handleChainRequest(message as ChainRequestMessage);
        break;
      case MessageType.CHAIN_RESPONSE:
        this.handleChainResponse(message as ChainResponseMessage);
        break;
      case MessageType.HEIGHT_REQUEST:
        this.handleHeightRequest(message as HeightRequestMessage);
        break;
      case MessageType.HEIGHT_RESPONSE:
        this.handleHeightResponse(message as HeightResponseMessage);
        break;
      default:
        console.error(`Unknown message type: ${(message as any).type}`);
    }
  }
  
  /**
   * Sets the peer IDs for this node
   */
  setPeers(peerIds: string[]): void {
    this.node.setPeers(peerIds);
  }
  
  /**
   * Starts mining on this node
   */
  startMining(): void {
    this.node.startMining();
  }
  
  /**
   * Stops mining on this node
   */
  stopMining(): void {
    this.node.stopMining();
  }
  
  /**
   * Gets the current state of the node
   */
  getState(): any {
    return this.node.getState();
  }
  
  /**
   * Handles a block broadcast event from the node
   * Creates a network message and sends it to peers via the network layer
   */
  private handleBlockBroadcast(block: Block): void {
    if (!this.onOutgoingMessageCallback) return;
    
    // Create a block announcement message
    const message: BlockAnnouncementMessage = {
      type: MessageType.BLOCK_ANNOUNCEMENT,
      fromNodeId: this.node.getState().nodeId,
      block
    };
    
    // Send the message to the network for routing
    this.onOutgoingMessageCallback(message);
  }
  

  
  /**
   * Handles a block announcement message from another node
   */
  private handleBlockAnnouncement(message: BlockAnnouncementMessage): void {
    // Process the received block
    this.node.receiveBlock(message.block);
  }
  
  /**
   * Handles a chain request message from another node
   * Responds with this node's blockchain
   */
  private handleChainRequest(message: ChainRequestMessage): void {
    if (!this.onOutgoingMessageCallback) return;
    
    // Get all blocks in the chain
    const blocks = this.node.getBlocks();
    
    // Create a chain response message
    const response: ChainResponseMessage = {
      type: MessageType.CHAIN_RESPONSE,
      fromNodeId: this.node.getState().nodeId,
      toNodeId: message.fromNodeId,
      blocks
    };
    
    // Send the response to the network for routing
    this.onOutgoingMessageCallback(response);
  }
  
  /**
   * Handles a chain response message from another node
   */
  private handleChainResponse(message: ChainResponseMessage): void {
    // Process the received chain
    this.node.receiveChain(message.blocks);
  }
  
  /**
   * Handles a height request message from another node
   * Responds with this node's current blockchain height
   */
  private handleHeightRequest(message: HeightRequestMessage): void {
    if (!this.onOutgoingMessageCallback) return;
    
    // Get the current blockchain height
    const height = this.node.getBlockchainHeight();
    
    // Create a height response message
    const response: HeightResponseMessage = {
      type: MessageType.HEIGHT_RESPONSE,
      fromNodeId: this.node.getState().nodeId,
      toNodeId: message.fromNodeId,
      height
    };
    
    // Send the response to the network for routing
    this.onOutgoingMessageCallback(response);
  }
  
  /**
   * Handles a height response message from another node
   */
  private handleHeightResponse(message: HeightResponseMessage): void {
    // If the other node has a longer chain, request it
    if (message.height > this.node.getBlockchainHeight()) {
      this.requestChain(message.fromNodeId);
    }
  }
  
  /**
   * Requests the blockchain from a specific node
   */
  requestChain(nodeId: string): void {
    if (!this.onOutgoingMessageCallback) return;
    
    // Create a chain request message
    const message: ChainRequestMessage = {
      type: MessageType.CHAIN_REQUEST,
      fromNodeId: this.node.getState().nodeId,
      toNodeId: nodeId
    };
    
    // Send the message to the network for routing
    this.onOutgoingMessageCallback(message);
  }
  
  /**
   * Requests the blockchain height from a specific node
   */
  requestHeight(nodeId: string): void {
    if (!this.onOutgoingMessageCallback) return;
    
    // Create a height request message
    const message: HeightRequestMessage = {
      type: MessageType.HEIGHT_REQUEST,
      fromNodeId: this.node.getState().nodeId,
      toNodeId: nodeId
    };
    
    // Send the message to the network for routing
    this.onOutgoingMessageCallback(message);
  }
  
  /**
   * Requests the blockchain height from all peers
   */
  requestHeightFromPeers(): void {
    const peerIds = this.node.getState().peerIds;
    
    // Request height from each peer
    for (const peerId of peerIds) {
      this.requestHeight(peerId);
    }
  }
}
