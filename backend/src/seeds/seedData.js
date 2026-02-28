const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Worker = require('../models/Worker');
const Workstation = require('../models/Workstation');
const Event = require('../models/Event');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/worker-productivity';

// Sample workers data
const workersData = [
  {
    worker_id: 'W1',
    name: 'Assembly Line Operator – Station A',
    email: 'operator.a@acme-factory.com',
    department: 'Assembly',
    shift: 'day'
  },
  {
    worker_id: 'W2',
    name: 'Assembly Line Operator – Station B',
    email: 'operator.b@acme-factory.com',
    department: 'Assembly',
    shift: 'day'
  },
  {
    worker_id: 'W3',
    name: 'Quality Inspector – Line 1',
    email: 'inspector.1@acme-factory.com',
    department: 'Quality',
    shift: 'day'
  },
  {
    worker_id: 'W4',
    name: 'Packaging Technician – Shift Night',
    email: 'packing.night@acme-factory.com',
    department: 'Packaging',
    shift: 'night'
  },
  {
    worker_id: 'W5',
    name: 'Welding Specialist – Unit 2',
    email: 'welding.2@acme-factory.com',
    department: 'Welding',
    shift: 'night'
  },
  {
    worker_id: 'W6',
    name: 'Testing Technician – Final Check',
    email: 'testing.final@acme-factory.com',
    department: 'Testing',
    shift: 'day'
  }
];

// Sample workstations data
const workstationsData = [
  {
    station_id: 'S1',
    name: 'Assembly Line — Conveyor A',
    type: 'assembly',
    location: 'Manufacturing Wing, Floor 1'
  },
  {
    station_id: 'S2',
    name: 'Assembly Line — Conveyor B',
    type: 'assembly',
    location: 'Manufacturing Wing, Floor 1'
  },
  {
    station_id: 'S3',
    name: 'Quality Control — Inspection Station',
    type: 'quality_check',
    location: 'QC Department, Building B'
  },
  {
    station_id: 'S4',
    name: 'Packaging & Labeling — Unit 1',
    type: 'packaging',
    location: 'Logistics Wing, Floor 2'
  },
  {
    station_id: 'S5',
    name: 'Welding — Robotic Bay',
    type: 'welding',
    location: 'Heavy Manufacturing, Building C'
  },
  {
    station_id: 'S6',
    name: 'Final Testing & Verification',
    type: 'testing',
    location: 'Testing Lab, Building D'
  }
];

// Generate realistic event data
function generateEventsData() {
  const events = [];
  const now = new Date();
  
  // Generate events for the last 24 hours
  for (let hourOffset = 0; hourOffset < 24; hourOffset++) {
    const baseTime = new Date(now.getTime() - hourOffset * 60 * 60 * 1000);

    workersData.forEach((worker, workerIdx) => {
      const station = workstationsData[workerIdx % 6];

      // Generate working events (bulk of events)
      for (let i = 0; i < 8; i++) {
        const eventTime = new Date(baseTime.getTime() + i * 10 * 60 * 1000 + Math.random() * 60000);
        events.push({
          timestamp: eventTime,
          worker_id: worker.worker_id,
          workstation_id: station.station_id,
          event_type: 'working',
          confidence: 0.92 + Math.random() * 0.08,
          duration: 5 + Math.random() * 10 // 5-15 minutes
        });
      }

      // Generate idle events (20% of the time)
      for (let i = 0; i < 2; i++) {
        const eventTime = new Date(baseTime.getTime() + (90 + i * 30) * 60 * 1000 + Math.random() * 60000);
        events.push({
          timestamp: eventTime,
          worker_id: worker.worker_id,
          workstation_id: station.station_id,
          event_type: 'idle',
          confidence: 0.88 + Math.random() * 0.12,
          duration: 3 + Math.random() * 7 // 3-10 minutes
        });
      }

      // Generate product count events
      for (let i = 0; i < 4; i++) {
        const eventTime = new Date(baseTime.getTime() + (20 + i * 20) * 60 * 1000 + Math.random() * 60000);
        events.push({
          timestamp: eventTime,
          worker_id: worker.worker_id,
          workstation_id: station.station_id,
          event_type: 'product_count',
          confidence: 0.95 + Math.random() * 0.05,
          count: Math.floor(1 + Math.random() * 5) // 1-5 units
        });
      }

      // Occasional absent event
      if (Math.random() < 0.1) {
        const eventTime = new Date(baseTime.getTime() + Math.random() * 60 * 60 * 1000);
        events.push({
          timestamp: eventTime,
          worker_id: worker.worker_id,
          workstation_id: station.station_id,
          event_type: 'absent',
          confidence: 0.99
        });
      }
    });
  }

  return events;
}

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB connected');

    // Clear existing data
    await Worker.deleteMany({});
    await Workstation.deleteMany({});
    await Event.deleteMany({});

    console.log('Cleared existing data');

    // Insert workers
    const insertedWorkers = await Worker.insertMany(workersData);
    console.log(`Inserted ${insertedWorkers.length} workers`);

    // Insert workstations
    const insertedWorkstations = await Workstation.insertMany(workstationsData);
    console.log(`Inserted ${insertedWorkstations.length} workstations`);

    // Generate and insert events
    const eventsData = generateEventsData();
    const insertedEvents = await Event.insertMany(eventsData);
    console.log(`Inserted ${insertedEvents.length} events`);

    console.log('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
