import { Block, UTXOSet } from '../../types/types';
import { createGenesisBlock } from './block';
import { rebuildUTXOSet, updateUTXOSet } from './utxo';
import { validateBlock, calculateBlockHeaderHash } from '../validation/blockValidator';
import { validateChain } from '../validation/chainValidator';

/**
 * Blockchain class to manage the chain of blocks and UTXO set
 */
export class Blockchain {
  private blocks: Block[] = [];
  private utxoSet: UTXOSet = {};
  private nodeId: string;
  
  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.initializeChain();
  }
  
  /**
   * Initializes the blockchain with a genesis block
   */
  private initializeChain(): void {
    const genesisBlock = createGenesisBlock(this.nodeId);
    this.blocks.push(genesisBlock);
    
    // Initialize UTXO set with genesis block transactions
    const allTransactions = this.blocks.flatMap(block => block.transactions);
    this.utxoSet = rebuildUTXOSet(allTransactions);
  }
  
  /**
   * Gets all blocks in the blockchain
   */
  getBlocks(): Block[] {
    return [...this.blocks];
  }
  
  /**
   * Gets the current UTXO set
   */
  getUTXOSet(): UTXOSet {
    return { ...this.utxoSet };
  }
  
  /**
   * Gets the latest block in the chain
   */
  getLatestBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }
  
  /**
   * Gets the current blockchain height
   */
  getHeight(): number {
    return this.blocks.length - 1;
  }
  
  /**
   * Adds a new block to the chain if valid
   * Returns true if the block was added, false otherwise
   */
  addBlock(block: Block): boolean {
    // Ensure block has a hash
    if (!block.hash) {
      block.hash = calculateBlockHeaderHash(block.header);
    }
    
    // Get the previous block
    const previousBlock = this.blocks.length > 0 ? this.blocks[this.blocks.length - 1] : null;
    
    // Validate the block
    if (!validateBlock(block, previousBlock, this.utxoSet)) {
      return false;
    }
    
    // Update UTXO set with all transactions in the block
    let newUtxoSet = { ...this.utxoSet };
    for (const transaction of block.transactions) {
      newUtxoSet = updateUTXOSet(newUtxoSet, transaction);
    }
    
    // Add the block to the chain
    this.blocks.push(block);
    this.utxoSet = newUtxoSet;
    
    return true;
  }
  
  /**
   * Replaces the current chain with a new one if it's valid and longer
   * Returns true if the chain was replaced, false otherwise
   */
  replaceChain(newBlocks: Block[]): boolean {
    // Validate the new chain
    if (!this.isValidChain(newBlocks)) {
      return false;
    }
    
    // Check if the new chain is longer
    if (newBlocks.length <= this.blocks.length) {
      return false;
    }
    
    // Replace the chain
    this.blocks = [...newBlocks];
    
    // Rebuild the UTXO set
    const allTransactions = this.blocks.flatMap(block => block.transactions);
    this.utxoSet = rebuildUTXOSet(allTransactions);
    
    return true;
  }
  
  /**
   * Validates a chain of blocks
   */
  private isValidChain(chain: Block[]): boolean {
    return validateChain(chain, createGenesisBlock(this.nodeId));
  }
  
  /**
   * Gets a block by its hash
   */
  getBlockByHash(hash: string): Block | undefined {
    return this.blocks.find(block => block.hash === hash);
  }
  
  /**
   * Gets a block by its height
   */
  getBlockByHeight(height: number): Block | undefined {
    return height >= 0 && height < this.blocks.length ? this.blocks[height] : undefined;
  }
}
