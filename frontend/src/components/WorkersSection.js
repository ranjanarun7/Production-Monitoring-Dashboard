import React, { useState } from 'react';
import WorkerCard from './WorkerCard';

const WorkersSection = ({ workers, metrics, loading, error }) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [sortBy, setSortBy] = useState('name');

  if (loading) {
    return (
      <div className="section">
        <h2>👷 Workers Performance</h2>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#666' }}>Loading worker metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section">
        <div className="error-message">
          <strong>Error loading workers:</strong> {error}
        </div>
      </div>
    );
  }

  const sortedWorkers = [...workers].sort((a, b) => {
    const metricA = metrics.find(m => m.worker_id === a.worker_id) || {};
    const metricB = metrics.find(m => m.worker_id === b.worker_id) || {};

    switch (sortBy) {
      case 'utilization':
        return (metricB.utilization_percentage || 0) - (metricA.utilization_percentage || 0);
      case 'production':
        return (metricB.total_units_produced || 0) - (metricA.total_units_produced || 0);
      case 'active_time':
        return (metricB.total_active_time_minutes || 0) - (metricA.total_active_time_minutes || 0);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return (
    <div className="section">
      <div className="section-header">
        <h2>Workers Performance ({sortedWorkers.length})</h2>
        <div className="sort-controls">
          <label>Sort by: </label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Name</option>
            <option value="utilization">Utilization</option>
            <option value="production">Production</option>
            <option value="active_time">Active Time</option>
          </select>
        </div>
      </div>
      <div className="cards-grid">
        {sortedWorkers.map((worker) => (
          <WorkerCard
            key={worker.worker_id}
            worker={worker}
            metrics={metrics.find(m => m.worker_id === worker.worker_id)}
            onClick={() => setSelectedWorkerId(selectedWorkerId === worker.worker_id ? null : worker.worker_id)}
            isSelected={selectedWorkerId === worker.worker_id}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkersSection;
