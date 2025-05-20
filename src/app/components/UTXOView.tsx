import React, { useState, useEffect, useMemo } from 'react';
import { UTXOSet, TransactionOutput } from '../../types/types';
import './UTXOView.css';

// Icons for copy buttons
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

interface UTXOViewProps {
  utxoSet: UTXOSet;
}

const UTXOView: React.FC<UTXOViewProps> = ({ utxoSet }) => {
  const [filterAddress, setFilterAddress] = useState<string>('');
  const [filterNodeId, setFilterNodeId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const itemsPerPage = 10;

  // Use useMemo to calculate filtered UTXOs only when utxoSet or filters change
  const filteredUtxos = useMemo(() => {
    const utxoEntries = Object.entries(utxoSet);
    
    // Apply both filters
    return utxoEntries.filter(([_, output]) => {
      // Address filter
      const addressMatch = !filterAddress || 
        output.lock.toLowerCase().includes(filterAddress.toLowerCase());
      
      // Node ID filter
      const nodeMatch = !filterNodeId || 
        output.nodeId.toLowerCase().includes(filterNodeId.toLowerCase());
      
      // Both filters must match
      return addressMatch && nodeMatch;
    });
  }, [utxoSet, filterAddress, filterNodeId]);
  
  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterAddress, filterNodeId]);

  // Calculate pagination values using useMemo to prevent unnecessary recalculations
  const { totalPages, currentUtxos } = useMemo(() => {
    const totalPages = Math.ceil(filteredUtxos.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentUtxos = filteredUtxos.slice(startIndex, endIndex);
    
    return { totalPages, currentUtxos };
  }, [filteredUtxos, currentPage, itemsPerPage]);

  // Handle pagination
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Format UTXO ID for display (truncate if too long)
  const formatUtxoId = (utxoId: string) => {
    if (utxoId.length > 20) {
      return `${utxoId.substring(0, 10)}...${utxoId.substring(utxoId.length - 10)}`;
    }
    return utxoId;
  };

  // Format address for display (truncate if too long)
  const formatAddress = (address: string) => {
    if (address.length > 20) {
      return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
    }
    return address;
  };

  // Copy a single UTXO to clipboard
  const copyToClipboard = (utxoId: string, output: TransactionOutput) => {
    const utxoData = {
      id: utxoId,
      nodeId: output.nodeId,
      value: output.value,
      address: output.lock
    };
    
    navigator.clipboard.writeText(JSON.stringify(utxoData, null, 2))
      .then(() => {
        setCopiedItem(utxoId);
        setTimeout(() => setCopiedItem(null), 2000);
      })
      .catch(err => console.error('Failed to copy: ', err));
  };
  
  // Copy entire UTXO set to clipboard
  const copyAllToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(utxoSet, null, 2))
      .then(() => {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      })
      .catch(err => console.error('Failed to copy all: ', err));
  };

  return (
    <div className="utxo-view">
      <div className="utxo-header-actions">
        <h3 className="utxo-title">UTXO Set ({Object.keys(utxoSet).length})</h3>
        <button 
          className="copy-all-button" 
          onClick={copyAllToClipboard}
          title="Copy entire UTXO set as JSON"
        >
          {copiedAll ? <span className="copied-text"><CheckIcon /> Copied!</span> : <span><CopyIcon /> Copy All</span>}
        </button>
      </div>
      <div className="utxo-filters">
        <div className="utxo-filter">
          <input
            type="text"
            placeholder="Filter by address..."
            value={filterAddress}
            onChange={(e) => setFilterAddress(e.target.value)}
            className="utxo-filter-input"
          />
          {filterAddress && (
            <button 
              className="utxo-filter-clear" 
              onClick={() => setFilterAddress('')}
            >
              ×
            </button>
          )}
        </div>
        
        <div className="utxo-filter">
          <input
            type="text"
            placeholder="Filter by node ID..."
            value={filterNodeId}
            onChange={(e) => setFilterNodeId(e.target.value)}
            className="utxo-filter-input"
          />
          {filterNodeId && (
            <button 
              className="utxo-filter-clear" 
              onClick={() => setFilterNodeId('')}
            >
              ×
            </button>
          )}
        </div>
        
        {(filterAddress || filterNodeId) && (
          <button 
            className="utxo-filter-reset" 
            onClick={() => {
              setFilterAddress('');
              setFilterNodeId('');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      <div className="utxo-header">
        <div className="utxo-id-header">UTXO ID</div>
        <div className="utxo-node-header">Node ID</div>
        <div className="utxo-value-header">Value</div>
        <div className="utxo-address-header">Address</div>
        <div className="utxo-actions-header">Actions</div>
      </div>

      <div className="utxo-list">
        {currentUtxos.length > 0 ? (
          currentUtxos.map(([utxoId, output]: [string, TransactionOutput]) => (
            <div key={utxoId} className="utxo-item">
              <div className="utxo-id" title={utxoId}>{formatUtxoId(utxoId)}</div>
              <div className="utxo-node">{output.nodeId}</div>
              <div className="utxo-value">{output.value.toFixed(2)} BTC</div>
              <div className="utxo-address" title={output.lock}>{formatAddress(output.lock)}</div>
              <div className="utxo-actions">
                <button 
                  className="copy-button" 
                  onClick={() => copyToClipboard(utxoId, output)}
                  title="Copy UTXO data as JSON"
                >
                  {copiedItem === utxoId ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="utxo-empty">
            {filterAddress 
              ? `No UTXOs found matching address filter: ${filterAddress}` 
              : 'No UTXOs available'}
          </div>
        )}
      </div>

      {filteredUtxos.length > 0 && (
        <div className="utxo-pagination">
          <button 
            onClick={handlePrevPage} 
            disabled={currentPage === 1}
            className="pagination-button"
          >
            &lt; Prev
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages} 
            ({filteredUtxos.length} UTXOs)
          </span>
          <button 
            onClick={handleNextPage} 
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next &gt;
          </button>
        </div>
      )}
    </div>
  );
};

export default UTXOView;
