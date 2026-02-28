import React from 'react';

const FactorySummary = ({ metrics, loading, error }) => {
  if (loading) {
    return (
      <div className="factory-summary">
        <h2>Factory Summary</h2>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#666' }}>Loading factory metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="factory-summary">
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="factory-summary">
        <h2>Factory Summary</h2>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <p>No data available. Try seeding the database.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="factory-summary">
      <h2>Factory Summary</h2>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Productive Time</div>
          <div className="metric-value">{(metrics.total_productive_time_minutes || 0).toFixed(0)}</div>
          <div className="metric-unit">minutes</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Production</div>
          <div className="metric-value">{metrics.total_production_count || 0}</div>
          <div className="metric-unit">units</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Production Rate</div>
          <div className="metric-value">{(metrics.average_production_rate_units_per_hour || 0).toFixed(2)}</div>
          <div className="metric-unit">units/hour</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Utilization</div>
          <div className="metric-value">{(metrics.average_utilization_percentage || 0).toFixed(1)}</div>
          <div className="metric-unit">%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Factory Utilization</div>
          <div className="metric-value">{(metrics.factory_utilization_percentage || 0).toFixed(1)}</div>
          <div className="metric-unit">%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Workers</div>
          <div className="metric-value">{metrics.active_workers || 0}</div>
          <div className="metric-unit">workers</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Stations</div>
          <div className="metric-value">{metrics.active_stations || 0}</div>
          <div className="metric-unit">stations</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Events</div>
          <div className="metric-value">{metrics.total_events || 0}</div>
          <div className="metric-unit">events</div>
        </div>
      </div>
    </div>
  );
};

export default FactorySummary;
