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
  private onMessageCallback?: (message: Message) => void;
  
  constructor(nodeId: string) {
    // Create the node instance
    this.node = new Node(nodeId);
    
    // Set up callbacks for node events
    this.node.setOnBlockBroadcast(this.handleBlockBroadcast.bind(this));
    this.node.setOnChainUpdated(this.handleChainUpdated.bind(this));
  }
  
  /**
   * Sets the callback for when a message needs to be sent
   */
  setOnMessage(callback: (message: Message) => void): void {
    this.onMessageCallback = callback;
  }
  
  /**
   * Handles incoming messages from other nodes
   */
  handleMessage(message: Message): void {
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
   */
  private handleBlockBroadcast(block: Block): void {
    if (!this.onMessageCallback) return;
    
    // Create a block announcement message
    const message: BlockAnnouncementMessage = {
      type: MessageType.BLOCK_ANNOUNCEMENT,
      fromNodeId: this.node.getState().nodeId,
      block
    };
    
    // Send the message
    this.onMessageCallback(message);
  }
  
  /**
   * Handles a chain updated event from the node
   */
  private handleChainUpdated(): void {
    // This is a local event, no need to send a message
    // But we could use this to trigger a height announcement if needed
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
   */
  private handleChainRequest(message: ChainRequestMessage): void {
    if (!this.onMessageCallback) return;
    
    // Get all blocks in the chain
    const blocks = this.node.getBlocks();
    
    // Create a chain response message
    const response: ChainResponseMessage = {
      type: MessageType.CHAIN_RESPONSE,
      fromNodeId: this.node.getState().nodeId,
      toNodeId: message.fromNodeId,
      blocks
    };
    
    // Send the response
    this.onMessageCallback(response);
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
   */
  private handleHeightRequest(message: HeightRequestMessage): void {
    if (!this.onMessageCallback) return;
    
    // Get the current blockchain height
    const height = this.node.getBlockchainHeight();
    
    // Create a height response message
    const response: HeightResponseMessage = {
      type: MessageType.HEIGHT_RESPONSE,
      fromNodeId: this.node.getState().nodeId,
      toNodeId: message.fromNodeId,
      height
    };
    
    // Send the response
    this.onMessageCallback(response);
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
    if (!this.onMessageCallback) return;
    
    // Create a chain request message
    const message: ChainRequestMessage = {
      type: MessageType.CHAIN_REQUEST,
      fromNodeId: this.node.getState().nodeId,
      toNodeId: nodeId
    };
    
    // Send the message
    this.onMessageCallback(message);
  }
  
  /**
   * Requests the blockchain height from a specific node
   */
  requestHeight(nodeId: string): void {
    if (!this.onMessageCallback) return;
    
    // Create a height request message
    const message: HeightRequestMessage = {
      type: MessageType.HEIGHT_REQUEST,
      fromNodeId: this.node.getState().nodeId,
      toNodeId: nodeId
    };
    
    // Send the message
    this.onMessageCallback(message);
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
