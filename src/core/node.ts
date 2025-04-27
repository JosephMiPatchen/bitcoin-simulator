import { Block, NodeState } from '../types/types';
import { Blockchain } from './blockchain/blockchain';
import { Miner } from './mining/miner';

/**
 * Node class representing a full node in the Bitcoin network
 * Integrates blockchain and mining functionality
 */
export class Node {
  private nodeId: string;
  private blockchain: Blockchain;
  private miner: Miner;
  private peerIds: string[] = [];
  
  // Callbacks for network events
  private onBlockBroadcast?: (block: Block) => void;
  private onChainUpdated?: () => void;
  
  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.blockchain = new Blockchain(nodeId);
    
    // Initialize miner with callback for when a block is mined
    this.miner = new Miner(nodeId, this.handleMinedBlock.bind(this));
  }
  
  /**
   * Sets the peer IDs for this node
   */
  setPeers(peerIds: string[]): void {
    this.peerIds = [...peerIds];
    this.miner.setPeerIds(peerIds);
  }
  
  /**
   * Sets the callback for when a block is broadcast
   */
  setOnBlockBroadcast(callback: (block: Block) => void): void {
    this.onBlockBroadcast = callback;
  }
  
  /**
   * Sets the callback for when the chain is updated
   */
  setOnChainUpdated(callback: () => void): void {
    this.onChainUpdated = callback;
  }
  
  /**
   * Gets the current state of the node
   */
  getState(): NodeState {
    return {
      nodeId: this.nodeId,
      blockchain: this.blockchain.getBlocks(),
      utxo: this.blockchain.getUTXOSet(),
      isMining: this.miner.getIsMining(),
      peerIds: [...this.peerIds]
    };
  }
  
  /**
   * Starts mining a new block
   */
  startMining(): void {
    const latestBlock = this.blockchain.getLatestBlock();
    this.miner.startMining(latestBlock);
  }
  
  /**
   * Stops mining
   */
  stopMining(): void {
    this.miner.stopMining();
  }
  
  /**
   * Handles a block received from the network
   */
  receiveBlock(block: Block): void {
    // Validate and add the block to the chain
    const added = this.blockchain.addBlock(block);
    
    if (added) {
      // Stop mining the current block
      this.miner.stopMining();
      
      // Start mining a new block on top of the received block
      this.startMining();
      
      // Notify that the chain was updated
      if (this.onChainUpdated) {
        this.onChainUpdated();
      }
    }
  }
  
  /**
   * Handles a chain received from the network
   */
  receiveChain(blocks: Block[]): void {
    // Try to replace our chain with the received one
    const replaced = this.blockchain.replaceChain(blocks);
    
    if (replaced) {
      // Stop mining the current block
      this.miner.stopMining();
      
      // Start mining a new block on top of the new chain
      this.startMining();
      
      // Notify that the chain was updated
      if (this.onChainUpdated) {
        this.onChainUpdated();
      }
    }
  }
  
  /**
   * Handles a block that was mined by this node
   */
  private handleMinedBlock(block: Block): void {
    // Add the block to our chain
    const added = this.blockchain.addBlock(block);
    
    if (added) {
      // Broadcast the block to peers
      if (this.onBlockBroadcast) {
        this.onBlockBroadcast(block);
      }
      
      // Start mining a new block
      this.startMining();
      
      // Notify that the chain was updated
      if (this.onChainUpdated) {
        this.onChainUpdated();
      }
    }
  }
  
  /**
   * Gets the current blockchain height
   */
  getBlockchainHeight(): number {
    return this.blockchain.getHeight();
  }
  
  /**
   * Gets all blocks in the blockchain
   */
  getBlocks(): Block[] {
    return this.blockchain.getBlocks();
  }
}
