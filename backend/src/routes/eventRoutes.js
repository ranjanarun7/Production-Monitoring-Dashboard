const express = require('express');
const router = express.Router();
const EventService = require('../services/EventService');

// SPECIFIC ROUTES FIRST (before generic catch-all routes)

// Ingest batch of events
router.post('/batch', async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }
    const result = await EventService.ingestBatch(events);
    res.status(207).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reseed database with sample data
router.post('/reseed', async (req, res) => {
  try {
    const result = await EventService.reseedSampleData();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get event statistics
router.get('/statistics', async (req, res) => {
  try {
    const startDate = req.query.start_date ? new Date(req.query.start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.end_date ? new Date(req.query.end_date) : new Date();
    const stats = await EventService.getEventStatistics(startDate, endDate);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all events (for testing)
router.delete('/clear', async (req, res) => {
  try {
    const result = await EventService.clearAllEvents();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GENERIC ROUTES LAST (catch-all routes)

// Ingest a single event
router.post('/', async (req, res) => {
  try {
    const result = await EventService.ingestEvent(req.body);
    res.status(result.success ? 201 : 409).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get events with filtering
router.get('/', async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 100;
    const result = await EventService.getEvents(req.query, skip, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
