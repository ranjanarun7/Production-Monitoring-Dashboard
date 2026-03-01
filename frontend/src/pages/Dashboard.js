import React, { useState, useEffect, useCallback, useRef } from 'react';
import FactorySummary from '../components/FactorySummary';
import WorkersSection from '../components/WorkersSection';
import WorkstationsSection from '../components/WorkstationsSection';
import Controls from '../components/Controls';
import { metricsService, workerService, workstationService, eventService } from '../services/api';

const Dashboard = () => {
  const [factoryMetrics, setFactoryMetrics] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [workstations, setWorkstations] = useState([]);
  const [workerMetrics, setWorkerMetrics] = useState([]);
  const [workstationMetrics, setWorkstationMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date()
  });

  // OPTIMIZATION: Debounce timer to prevent excessive API calls on date range changes
  const debounceTimer = useRef(null);

  // Helper function to properly parse datetime-local input
  const parseLocalDateTime = (dateString) => {
    // datetime-local format: "2026-01-15T14:30"
    // Parse as local time, not UTC
    const [datePart, timePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  const loadData = useCallback(async (startDate, endDate) => {
    try {
      setLoading(true);
      setError(null);

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // OPTIMIZATION: Load all data in parallel for better performance
      // Workers and Workstations data is relatively static, so they could be cached separately
      const [workersRes, stationsRes, factoryRes, workerMetricsRes, stationMetricsRes] = await Promise.all([
        workerService.getAll(),
        workstationService.getAll(),
        metricsService.getFactoryMetrics(startISO, endISO),
        metricsService.getAllWorkerMetrics(startISO, endISO),
        metricsService.getAllWorkstationMetrics(startISO, endISO)
      ]);

      setWorkers(workersRes.data);
      setWorkstations(stationsRes.data);
      setFactoryMetrics(factoryRes.data);
      setWorkerMetrics(workerMetricsRes.data.metrics || []);
      setWorkstationMetrics(stationMetricsRes.data.metrics || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // OPTIMIZATION: Debounce date range changes to avoid excessive API calls
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      loadData(dateRange.start, dateRange.end);
    }, 800); // Wait 800ms after last date change before fetching

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [dateRange, loadData]);

  const seedData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Reseed database with fresh sample data
      await eventService.reseed();
      
      // Wait a moment for data to be written
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Reset date range to last 24 hours to capture new data
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      setDateRange({
        start: yesterday,
        end: now
      });
      
    } catch (err) {
      console.error('Error seeding data:', err);
      setError(err.message || 'Failed to seed data');
      setLoading(false);
    }
  };

  // Manual refresh (doesn't use debounce)
  const handleRefresh = () => {
    loadData(dateRange.start, dateRange.end);
  };

  return (
    <div className="dashboard">
      <header className="header">
        <h1>Production Monitoring Dashboard</h1>
        <p>Real-time factory operations and worker analytics | Plant Location: Main Factory, Building A</p>
      </header>

      <div className="container">
        <Controls 
          onRefresh={handleRefresh} 
          onSeedData={seedData}
          isLoading={loading}
        />

        <div className="date-controls">
          <label>From: </label>
          <input 
            type="datetime-local" 
            value={dateRange.start.toISOString().slice(0, 16)}
            onChange={(e) => {
              if (e.target.value) {
                setDateRange({
                  ...dateRange,
                  start: parseLocalDateTime(e.target.value)
                });
              }
            }}
          />
          <label>To: </label>
          <input 
            type="datetime-local" 
            value={dateRange.end.toISOString().slice(0, 16)}
            onChange={(e) => {
              if (e.target.value) {
                setDateRange({
                  ...dateRange,
                  end: parseLocalDateTime(e.target.value)
                });
              }
            }}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <FactorySummary 
          metrics={factoryMetrics} 
          loading={loading}
          error={null}
        />

        <WorkersSection
          workers={workers}
          metrics={workerMetrics}
          loading={loading}
          error={null}
        />

        <WorkstationsSection
          workstations={workstations}
          metrics={workstationMetrics}
          loading={loading}
          error={null}
        />
      </div>

      <footer className="footer">
        <p>ACME Manufacturing | Main Plant, Building A | Production Monitoring System v1.0</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>© 2026 ACME Corporation. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Dashboard;
