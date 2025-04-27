import { Block, Transaction } from '../../types/types';
import { SimulatorConfig } from '../../config/config';
import { 
  createCoinbaseTransaction, 
  createRedistributionTransaction 
} from '../blockchain/transaction';
import { createBlockTemplate } from '../blockchain/block';
import { calculateBlockHeaderHash } from '../validation/blockValidator';
import { isHashBelowCeiling } from '../../utils/hashUtils';

/**
 * Miner class responsible for creating and mining new blocks
 */
export class Miner {
  private isMining: boolean = false;
  private nodeId: string;
  private peerIds: string[] = [];
  private onBlockMined: (block: Block) => void;
  
  constructor(
    nodeId: string, 
    onBlockMined: (block: Block) => void
  ) {
    this.nodeId = nodeId;
    this.onBlockMined = onBlockMined;
  }
  
  /**
   * Sets the peer IDs for this miner
   */
  setPeerIds(peerIds: string[]): void {
    this.peerIds = [...peerIds];
  }
  
  /**
   * Gets the mining status
   */
  getIsMining(): boolean {
    return this.isMining;
  }
  
  /**
   * Creates transactions for a new block
   */
  private createBlockTransactions(height: number): Transaction[] {
    // Create coinbase transaction
    const coinbaseTransaction = createCoinbaseTransaction(this.nodeId, height);
    
    // If we have peers, create a redistribution transaction
    if (this.peerIds.length > 0 && coinbaseTransaction.txid) {
      const redistributionTransaction = createRedistributionTransaction(
        coinbaseTransaction.txid,
        this.nodeId,
        this.peerIds,
        height
      );
      
      return [coinbaseTransaction, redistributionTransaction];
    }
    
    // Otherwise, just return the coinbase transaction
    return [coinbaseTransaction];
  }
  
  /**
   * Starts mining a new block
   */
  startMining(previousBlock: Block): void {
    // Don't start if already mining
    if (this.isMining) return;
    
    this.isMining = true;
    
    // Create transactions for the new block
    const height = previousBlock.header.height + 1;
    const transactions = this.createBlockTransactions(height);
    
    // Create a block template
    const block = createBlockTemplate(previousBlock, transactions);
    
    // Start the mining process
    this.mineBlock(block, previousBlock.hash!);
  }
  
  /**
   * Stops the current mining operation
   */
  stopMining(): void {
    this.isMining = false;
  }
  
  /**
   * Mines a block by finding a valid nonce
   */
  private mineBlock(block: Block, expectedPreviousHash: string): void {
    // Schedule mining to not block the main thread
    setTimeout(() => {
      // Check if we should stop mining
      if (!this.isMining) return;
      
      // Perform a batch of mining attempts
      const batchSize = SimulatorConfig.MINING_BATCH_SIZE || 1000;
      let found = false;
      
      for (let i = 0; i < batchSize; i++) {
        // Calculate the block hash
        const blockHash = calculateBlockHeaderHash(block.header);
        
        // Check if the hash is valid
        if (isHashBelowCeiling(blockHash, SimulatorConfig.CEILING)) {
          // Found a valid block!
          block.hash = blockHash;
          this.handleMinedBlock(block);
          found = true;
          break;
        }
        
        // Try the next nonce
        block.header.nonce++;
      }
      
      // If we didn't find a valid block, continue mining
      if (!found && this.isMining) {
        // Check if the previous block hash is still the expected one
        // If not, we need to restart mining with the new previous block
        if (block.header.previousHeaderHash !== expectedPreviousHash) {
          console.log('Previous block changed, stopping current mining operation');
          this.stopMining();
          return;
        }
        
        this.mineBlock(block, expectedPreviousHash);
      }
    }, 0);
  }
  
  /**
   * Handles a successfully mined block
   */
  private handleMinedBlock(block: Block): void {
    this.isMining = false;
    
    // Notify listeners that a block was mined
    this.onBlockMined(block);
  }
}
