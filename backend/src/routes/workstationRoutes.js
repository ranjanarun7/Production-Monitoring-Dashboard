const express = require('express');
const router = express.Router();
const Workstation = require('../models/Workstation');

// Get all workstations
router.get('/', async (req, res) => {
  try {
    const workstations = await Workstation.find();
    res.json(workstations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single workstation
router.get('/:station_id', async (req, res) => {
  try {
    const workstation = await Workstation.findOne({ station_id: req.params.station_id });
    if (!workstation) {
      return res.status(404).json({ error: 'Workstation not found' });
    }
    res.json(workstation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create workstation
router.post('/', async (req, res) => {
  try {
    const workstation = new Workstation(req.body);
    await workstation.save();
    res.status(201).json(workstation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update workstation
router.put('/:station_id', async (req, res) => {
  try {
    const workstation = await Workstation.findOneAndUpdate(
      { station_id: req.params.station_id },
      req.body,
      { new: true }
    );
    if (!workstation) {
      return res.status(404).json({ error: 'Workstation not found' });
    }
    res.json(workstation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete workstation
router.delete('/:station_id', async (req, res) => {
  try {
    const workstation = await Workstation.findOneAndDelete({ station_id: req.params.station_id });
    if (!workstation) {
      return res.status(404).json({ error: 'Workstation not found' });
    }
    res.json({ message: 'Workstation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
