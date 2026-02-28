const Event = require('../models/Event');

class EventService {
  /**
   * Ingest a single event with duplicate detection
   * Returns true if event was ingested, false if duplicate
   */
  static async ingestEvent(eventData) {
    // Check for duplicate within 1 second window
    const existingEvent = await Event.findOne({
      worker_id: eventData.worker_id,
      workstation_id: eventData.workstation_id,
      event_type: eventData.event_type,
      timestamp: {
        $gte: new Date(new Date(eventData.timestamp).getTime() - 1000),
        $lte: new Date(new Date(eventData.timestamp).getTime() + 1000)
      }
    });

    if (existingEvent) {
      return {
        success: false,
        message: 'Duplicate event detected',
        eventId: existingEvent._id
      };
    }

    const event = new Event({
      timestamp: new Date(eventData.timestamp),
      worker_id: eventData.worker_id,
      workstation_id: eventData.workstation_id,
      event_type: eventData.event_type,
      confidence: eventData.confidence || 0.95,
      count: eventData.count || 0,
      duration: eventData.duration || null,
      metadata: eventData.metadata || {}
    });

    await event.save();

    return {
      success: true,
      message: 'Event ingested successfully',
      eventId: event._id
    };
  }

  /**
   * Ingest multiple events in batch
   */
  static async ingestBatch(events) {
    const results = [];
    const duplicates = [];
    const successful = [];

    for (const eventData of events) {
      const result = await this.ingestEvent(eventData);
      if (result.success) {
        successful.push(result.eventId);
      } else {
        duplicates.push({
          event: eventData,
          duplicateEventId: result.eventId
        });
      }
      results.push(result);
    }

    return {
      total_received: events.length,
      total_ingested: successful.length,
      total_duplicates: duplicates.length,
      details: results,
      successful_event_ids: successful
    };
  }

  /**
   * Get events with filtering and pagination
   */
  static async getEvents(filter = {}, skip = 0, limit = 100) {
    const query = {};

    if (filter.worker_id) query.worker_id = filter.worker_id;
    if (filter.workstation_id) query.workstation_id = filter.workstation_id;
    if (filter.event_type) query.event_type = filter.event_type;
    if (filter.start_date || filter.end_date) {
      query.timestamp = {};
      if (filter.start_date) query.timestamp.$gte = new Date(filter.start_date);
      if (filter.end_date) query.timestamp.$lte = new Date(filter.end_date);
    }

    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    return {
      total,
      count: events.length,
      skip,
      limit,
      events
    };
  }

  /**
   * Clear all events (for testing/demo purposes)
   */
  static async clearAllEvents() {
    const result = await Event.deleteMany({});
    return {
      deleted_count: result.deletedCount
    };
  }

  /**
   * Get event statistics
   */
  static async getEventStatistics(startDate, endDate) {
    const stats = await Event.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$event_type',
          count: { $sum: 1 },
          avg_confidence: { $avg: '$confidence' }
        }
      }
    ]);

    return {
      date_range: {
        start: startDate,
        end: endDate
      },
      event_types: stats
    };
  }

  /**
   * Reseed database with sample data
   */
  static async reseedSampleData() {
    // Clear existing events
    await Event.deleteMany({});

    // Generate new sample events for the last 24 hours
    const events = [];
    const now = new Date();
    const workerIds = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
    const stationIds = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

    for (let hourOffset = 0; hourOffset < 24; hourOffset++) {
      const baseTime = new Date(now.getTime() - hourOffset * 60 * 60 * 1000);

      workerIds.forEach((workerId, workerIdx) => {
        const stationId = stationIds[workerIdx % 6];

        // Working events (bulk)
        for (let i = 0; i < 8; i++) {
          const eventTime = new Date(baseTime.getTime() + i * 10 * 60 * 1000 + Math.random() * 60000);
          events.push({
            timestamp: eventTime,
            worker_id: workerId,
            workstation_id: stationId,
            event_type: 'working',
            confidence: 0.92 + Math.random() * 0.08,
            duration: 5 + Math.random() * 10
          });
        }

        // Idle events (20% of time)
        for (let i = 0; i < 2; i++) {
          const eventTime = new Date(baseTime.getTime() + (90 + i * 30) * 60 * 1000 + Math.random() * 60000);
          events.push({
            timestamp: eventTime,
            worker_id: workerId,
            workstation_id: stationId,
            event_type: 'idle',
            confidence: 0.88 + Math.random() * 0.12,
            duration: 3 + Math.random() * 7
          });
        }

        // Product count events
        for (let i = 0; i < 4; i++) {
          const eventTime = new Date(baseTime.getTime() + (20 + i * 20) * 60 * 1000 + Math.random() * 60000);
          events.push({
            timestamp: eventTime,
            worker_id: workerId,
            workstation_id: stationId,
            event_type: 'product_count',
            confidence: 0.95 + Math.random() * 0.05,
            count: Math.floor(1 + Math.random() * 5)
          });
        }

        // Occasional absent events
        if (Math.random() < 0.1) {
          const eventTime = new Date(baseTime.getTime() + Math.random() * 60 * 60 * 1000);
          events.push({
            timestamp: eventTime,
            worker_id: workerId,
            workstation_id: stationId,
            event_type: 'absent',
            confidence: 0.99
          });
        }
      });
    }

    // Insert all events
    const result = await Event.insertMany(events);

    return {
      success: true,
      message: 'Database reseeded successfully',
      total_events_inserted: result.length
    };
  }
}

module.exports = EventService;
