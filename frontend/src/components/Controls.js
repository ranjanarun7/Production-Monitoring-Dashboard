import React, { useState, useEffect } from 'react';

const Controls = ({ onRefresh, onSeedData, isLoading }) => {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    if (!isLoading) {
      setLastUpdated(new Date());
    }
  }, [isLoading]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="controls-bar">
      <button 
        onClick={onRefresh} 
        disabled={isLoading}
        className="btn btn-primary"
        title="Refresh metrics with current date range"
      >
        {isLoading ? 'Refreshing...' : 'Refresh Data'}
      </button>
      <button 
        onClick={onSeedData} 
        disabled={isLoading}
        className="btn btn-secondary"
        title="Generate fresh sample data"
      >
        {isLoading ? 'Seeding...' : 'Generate Sample Data'}
      </button>
      <div className="info-text">
        Last updated: {formatTime(lastUpdated)}
      </div>
    </div>
  );
};

export default Controls;
