const express = require('express');
const router = express.Router();
const MetricsService = require('../services/MetricsService');

// Get factory-level metrics
router.get('/factory', async (req, res) => {
  try {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    const metrics = await MetricsService.getFactoryMetrics(startDate, endDate);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get worker metrics
router.get('/worker/:worker_id', async (req, res) => {
  try {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    const metrics = await MetricsService.getWorkerMetrics(req.params.worker_id, startDate, endDate);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get workstation metrics
router.get('/workstation/:station_id', async (req, res) => {
  try {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    const metrics = await MetricsService.getWorkstationMetrics(req.params.station_id, startDate, endDate);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all workers metrics
router.get('/workers/all', async (req, res) => {
  try {
    const Worker = require('../models/Worker');
    const workers = await Worker.find();
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();

    const metricsPromises = workers.map(w => MetricsService.getWorkerMetrics(w.worker_id, startDate, endDate));
    const allMetrics = await Promise.all(metricsPromises);

    res.json({
      count: allMetrics.length,
      metrics: allMetrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all workstations metrics
router.get('/workstations/all', async (req, res) => {
  try {
    const Workstation = require('../models/Workstation');
    const workstations = await Workstation.find();
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();

    const metricsPromises = workstations.map(s => MetricsService.getWorkstationMetrics(s.station_id, startDate, endDate));
    const allMetrics = await Promise.all(metricsPromises);

    res.json({
      count: allMetrics.length,
      metrics: allMetrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detect duplicates
router.get('/audit/duplicates', async (req, res) => {
  try {
    const duplicates = await MetricsService.detectDuplicateEvents();
    res.json({
      duplicate_count: duplicates.length,
      duplicates
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detect out-of-order events
router.get('/audit/out-of-order/:worker_id', async (req, res) => {
  try {
    const issues = await MetricsService.detectOutOfOrderEvents(req.params.worker_id);
    res.json({
      issue_count: issues.length,
      issues
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
