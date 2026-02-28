import React from 'react';

const WorkstationCard = ({ workstation, metrics, onClick, isSelected }) => {
  const getUtilizationColor = (util) => {
    if (util >= 80) return '#48bb78';
    if (util >= 60) return '#ecc94b';
    return '#f56565';
  };

  const utilization = metrics?.utilization_percentage || 0;

  return (
    <div 
      className={`station-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="card-header">
        <h3>{workstation.name}</h3>
        <span className="station-id">{workstation.station_id}</span>
      </div>
      <div className="card-type">
        {workstation.type === 'assembly' && 'Assembly'}
        {workstation.type === 'packaging' && 'Packaging'}
        {workstation.type === 'quality_check' && 'Quality'}
        {workstation.type === 'welding' && 'Welding'}
        {workstation.type === 'testing' && 'Testing'}
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
              <span className="label">Occupancy Time</span>
              <span className="value">{(metrics.occupancy_time_minutes || 0).toFixed(0)} min</span>
            </div>
            <div className="metric-row">
              <span className="label">Idle Time</span>
              <span className="value">{(metrics.idle_time_minutes || 0).toFixed(0)} min</span>
            </div>
            <div className="metric-row">
              <span className="label">Units Produced</span>
              <span className="value highlight">{metrics.total_units_produced || 0}</span>
            </div>
            <div className="metric-row">
              <span className="label">Throughput Rate</span>
              <span className="value">{(metrics.throughput_rate_units_per_hour || 0).toFixed(2)} units/h</span>
            </div>
            <div className="metric-row">
              <span className="label">Workers Assigned</span>
              <span className="value">{metrics.unique_workers || 0}</span>
            </div>
          </>
        ) : (
          <p>Loading metrics...</p>
        )}
      </div>
    </div>
  );
};

export default WorkstationCard;
