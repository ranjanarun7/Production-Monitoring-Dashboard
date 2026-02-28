const express = require('express');
const router = express.Router();
const Worker = require('../models/Worker');

// Get all workers
router.get('/', async (req, res) => {
  try {
    const workers = await Worker.find();
    res.json(workers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single worker
router.get('/:worker_id', async (req, res) => {
  try {
    const worker = await Worker.findOne({ worker_id: req.params.worker_id });
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.json(worker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create worker
router.post('/', async (req, res) => {
  try {
    const worker = new Worker(req.body);
    await worker.save();
    res.status(201).json(worker);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update worker
router.put('/:worker_id', async (req, res) => {
  try {
    const worker = await Worker.findOneAndUpdate(
      { worker_id: req.params.worker_id },
      req.body,
      { new: true }
    );
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.json(worker);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete worker
router.delete('/:worker_id', async (req, res) => {
  try {
    const worker = await Worker.findOneAndDelete({ worker_id: req.params.worker_id });
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.json({ message: 'Worker deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
