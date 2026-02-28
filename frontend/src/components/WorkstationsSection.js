import React, { useState } from 'react';
import WorkstationCard from './WorkstationCard';

const WorkstationsSection = ({ workstations, metrics, loading, error }) => {
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [sortBy, setSortBy] = useState('name');

  if (loading) {
    return (
      <div className="section">
        <h2>🏭 Workstations Performance</h2>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#666' }}>Loading workstation metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section">
        <div className="error-message">
          <strong>Error loading workstations:</strong> {error}
        </div>
      </div>
    );
  }

  const sortedWorkstations = [...workstations].sort((a, b) => {
    const metricA = metrics.find(m => m.station_id === a.station_id) || {};
    const metricB = metrics.find(m => m.station_id === b.station_id) || {};

    switch (sortBy) {
      case 'utilization':
        return (metricB.utilization_percentage || 0) - (metricA.utilization_percentage || 0);
      case 'production':
        return (metricB.total_units_produced || 0) - (metricA.total_units_produced || 0);
      case 'throughput':
        return (metricB.throughput_rate_units_per_hour || 0) - (metricA.throughput_rate_units_per_hour || 0);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return (
    <div className="section">
      <div className="section-header">
        <h2>Workstations Performance ({sortedWorkstations.length})</h2>
        <div className="sort-controls">
          <label>Sort by: </label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Name</option>
            <option value="utilization">Utilization</option>
            <option value="production">Production</option>
            <option value="throughput">Throughput</option>
          </select>
        </div>
      </div>
      <div className="cards-grid">
        {sortedWorkstations.map((station) => (
          <WorkstationCard
            key={station.station_id}
            workstation={station}
            metrics={metrics.find(m => m.station_id === station.station_id)}
            onClick={() => setSelectedStationId(selectedStationId === station.station_id ? null : station.station_id)}
            isSelected={selectedStationId === station.station_id}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkstationsSection;
