import React from 'react';

const WorkerCard = ({ worker, metrics, onClick, isSelected }) => {
  const getUtilizationColor = (util) => {
    if (util >= 80) return '#48bb78';
    if (util >= 60) return '#ecc94b';
    return '#f56565';
  };

  const utilization = metrics?.utilization_percentage || 0;

  return (
    <div 
      className={`worker-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="card-header">
        <h3>{worker.name}</h3>
        <span className="worker-id">{worker.worker_id}</span>
      </div>
      <div className="card-body">
        {metrics ? (
          <>
            <div className="metric-row">
              <span className="label">Utilization</span>
              <span 
                className="value highlight" 
                style={{ color: getUtilizationColor(utilization) }}
              >
                {utilization.toFixed(1)}%
              </span>
            </div>
            <div className="metric-row">
              <span className="label">Active Time</span>
              <span className="value">{(metrics.total_active_time_minutes || 0).toFixed(0)} min</span>
            </div>
            <div className="metric-row">
              <span className="label">Idle Time</span>
              <span className="value">{(metrics.total_idle_time_minutes || 0).toFixed(0)} min</span>
            </div>
            <div className="metric-row">
              <span className="label">Units Produced</span>
              <span className="value highlight">{metrics.total_units_produced || 0}</span>
            </div>
            <div className="metric-row">
              <span className="label">Productivity Rate</span>
              <span className="value">{(metrics.units_per_hour || 0).toFixed(2)} units/h</span>
            </div>
            <div className="metric-row">
              <span className="label">Detection Confidence</span>
              <span className="value">{((metrics.average_confidence || 0) * 100).toFixed(1)}%</span>
            </div>
          </>
        ) : (
          <p>Loading metrics...</p>
        )}
      </div>
    </div>
  );
};

export default WorkerCard;
