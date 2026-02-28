import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000  // 30 seconds for production (handles Render cold starts)
});

export const workerService = {
  getAll: () => api.get('/workers'),
  getById: (workerId) => api.get(`/workers/${workerId}`),
  create: (data) => api.post('/workers', data),
  update: (workerId, data) => api.put(`/workers/${workerId}`, data),
  delete: (workerId) => api.delete(`/workers/${workerId}`)
};

export const workstationService = {
  getAll: () => api.get('/workstations'),
  getById: (stationId) => api.get(`/workstations/${stationId}`),
  create: (data) => api.post('/workstations', data),
  update: (stationId, data) => api.put(`/workstations/${stationId}`, data),
  delete: (stationId) => api.delete(`/workstations/${stationId}`)
};

export const eventService = {
  ingest: (event) => api.post('/events', event),
  ingestBatch: (events) => api.post('/events/batch', { events }),
  getAll: (filters = {}) => api.get('/events', { params: filters }),
  getStatistics: (startDate, endDate) => 
    api.get('/events/statistics', { 
      params: { start_date: startDate, end_date: endDate } 
    }),
  clear: () => api.delete('/events/clear'),
  reseed: () => api.post('/events/reseed')
};

export const metricsService = {
  getFactoryMetrics: (startDate, endDate) =>
    api.get('/metrics/factory', {
      params: { start_date: startDate, end_date: endDate }
    }),
  getWorkerMetrics: (workerId, startDate, endDate) =>
    api.get(`/metrics/worker/${workerId}`, {
      params: { start_date: startDate, end_date: endDate }
    }),
  getWorkstationMetrics: (stationId, startDate, endDate) =>
    api.get(`/metrics/workstation/${stationId}`, {
      params: { start_date: startDate, end_date: endDate }
    }),
  getAllWorkerMetrics: (startDate, endDate) =>
    api.get('/metrics/workers/all', {
      params: { start_date: startDate, end_date: endDate }
    }),
  getAllWorkstationMetrics: (startDate, endDate) =>
    api.get('/metrics/workstations/all', {
      params: { start_date: startDate, end_date: endDate }
    }),
  detectDuplicates: () => api.get('/metrics/audit/duplicates'),
  detectOutOfOrder: (workerId) => api.get(`/metrics/audit/out-of-order/${workerId}`)
};

export default api;
