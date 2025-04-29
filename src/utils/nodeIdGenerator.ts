/**
 * Utility for generating memorable node IDs using military phonetic alphabet
 */

// NATO phonetic alphabet
const PHONETIC_WORDS = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
  'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa',
  'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey',
  'X-ray', 'Yankee', 'Zulu'
];

/**
 * Generates a random node ID using a military phonetic word
 * Optionally adds a random number suffix for uniqueness
 */
export function generateNodeId(addNumberSuffix: boolean = true): string {
  // Pick a random word from the phonetic alphabet
  const randomIndex = Math.floor(Math.random() * PHONETIC_WORDS.length);
  const word = PHONETIC_WORDS[randomIndex];
  
  if (addNumberSuffix) {
    // Add a random number between 1-999 for uniqueness
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    return `${word}-${randomNumber}`;
  }
  
  return word;
}

/**
 * Generates an array of unique node IDs
 */
export function generateUniqueNodeIds(count: number): string[] {
  const nodeIds: string[] = [];
  const usedWords = new Set<string>();
  
  while (nodeIds.length < count) {
    const nodeId = generateNodeId();
    const baseWord = nodeId.split('-')[0]; // Get the word part
    
    // If we've used all words and need more IDs, allow duplicates with different numbers
    if (usedWords.size === PHONETIC_WORDS.length || !usedWords.has(baseWord)) {
      nodeIds.push(nodeId);
      usedWords.add(baseWord);
    }
  }
  
  return nodeIds;
}
