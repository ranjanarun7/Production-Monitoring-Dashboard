const Event = require('../models/Event');

class MetricsService {
  /**
   * Get worker metrics
   * Assumptions:
   * - Each "working" event is counted as active time (1 unit = 1 minute by default)
   * - "idle" events represent downtime
   * - "product_count" events accumulate into total units produced
   * - Utilization % = active_time / (active_time + idle_time) * 100
   */
  static async getWorkerMetrics(workerId, startDate, endDate) {
    const events = await Event.find({
      worker_id: workerId,
      timestamp: { $gte: startDate, $lte: endDate },
      event_type: { $in: ['working', 'idle', 'product_count'] }
    }).sort({ timestamp: 1 });

    let totalActiveTime = 0;
    let totalIdleTime = 0;
    let totalUnitsProduced = 0;
    let workingEvents = 0;
    let idleEvents = 0;

    events.forEach((event) => {
      if (event.event_type === 'working') {
        totalActiveTime += event.duration || 1; // 1 unit = 1 minute
        workingEvents++;
      } else if (event.event_type === 'idle') {
        totalIdleTime += event.duration || 1;
        idleEvents++;
      } else if (event.event_type === 'product_count') {
        totalUnitsProduced += event.count || 0;
      }
    });

    const totalTime = totalActiveTime + totalIdleTime;
    const utilizationPercentage = totalTime > 0 ? (totalActiveTime / totalTime) * 100 : 0;
    const unitsPerHour = totalActiveTime > 0 ? (totalUnitsProduced / (totalActiveTime / 60)) : 0;

    return {
      worker_id: workerId,
      total_active_time_minutes: totalActiveTime,
      total_idle_time_minutes: totalIdleTime,
      total_time_minutes: totalTime,
      utilization_percentage: parseFloat(utilizationPercentage.toFixed(2)),
      total_units_produced: totalUnitsProduced,
      units_per_hour: parseFloat(unitsPerHour.toFixed(2)),
      working_events_count: workingEvents,
      idle_events_count: idleEvents,
      average_confidence: await this.getAverageConfidence(workerId, startDate, endDate)
    };
  }

  /**
   * Get workstation metrics
   * Assumptions:
   * - Occupancy time = sum of all "working" events at the station
   * - Utilization % = occupancy_time / total_available_time * 100 (assuming 8-12 hours per day)
   * - Total units = sum of "product_count" events
   * - Throughput rate = units per hour of operation
   */
  static async getWorkstationMetrics(stationId, startDate, endDate) {
    const events = await Event.find({
      workstation_id: stationId,
      timestamp: { $gte: startDate, $lte: endDate },
      event_type: { $in: ['working', 'idle', 'product_count'] }
    }).sort({ timestamp: 1 });

    let totalOccupancyTime = 0;
    let totalIdleTime = 0;
    let totalUnitsProduced = 0;
    let workingEvents = 0;
    let uniqueWorkers = new Set();

    events.forEach((event) => {
      if (event.event_type === 'working') {
        totalOccupancyTime += event.duration || 1;
        workingEvents++;
        uniqueWorkers.add(event.worker_id);
      } else if (event.event_type === 'idle') {
        totalIdleTime += event.duration || 1;
      } else if (event.event_type === 'product_count') {
        totalUnitsProduced += event.count || 0;
      }
    });

    const totalTime = totalOccupancyTime + totalIdleTime;
    const utilizationPercentage = totalTime > 0 ? (totalOccupancyTime / totalTime) * 100 : 0;
    const throughputRate = totalOccupancyTime > 0 ? (totalUnitsProduced / (totalOccupancyTime / 60)) : 0;

    return {
      station_id: stationId,
      occupancy_time_minutes: totalOccupancyTime,
      idle_time_minutes: totalIdleTime,
      total_time_minutes: totalTime,
      utilization_percentage: parseFloat(utilizationPercentage.toFixed(2)),
      total_units_produced: totalUnitsProduced,
      throughput_rate_units_per_hour: parseFloat(throughputRate.toFixed(2)),
      working_events_count: workingEvents,
      unique_workers: uniqueWorkers.size,
      average_confidence: await this.getAverageConfidenceStation(stationId, startDate, endDate)
    };
  }

  /**
   * Get factory-level metrics
   * Assumptions:
   * - Total productive time = sum of all "working" events across all workers
   * - Total production count = sum of all "product_count" events
   * - Average production rate = total units / total working hours
   * - Average utilization = avg of all worker utilization percentages
   */
  static async getFactoryMetrics(startDate, endDate) {
    const allEvents = await Event.find({
      timestamp: { $gte: startDate, $lte: endDate },
      event_type: { $in: ['working', 'idle', 'product_count'] }
    });

    let totalProductiveTime = 0;
    let totalIdleTime = 0;
    let totalProduction = 0;
    const workerMetricsMap = new Map();
    const stationMetricsMap = new Map();

    // Aggregate data
    allEvents.forEach((event) => {
      if (event.event_type === 'working') {
        totalProductiveTime += event.duration || 1;
      } else if (event.event_type === 'idle') {
        totalIdleTime += event.duration || 1;
      } else if (event.event_type === 'product_count') {
        totalProduction += event.count || 0;
      }
    });

    // Get all unique workers and their utilization
    const uniqueWorkers = new Set();
    const uniqueStations = new Set();
    let totalUtilization = 0;
    let workerCount = 0;

    allEvents.forEach((event) => {
      uniqueWorkers.add(event.worker_id);
      uniqueStations.add(event.workstation_id);
    });

    // Calculate average utilization
    for (const workerId of uniqueWorkers) {
      const metrics = await this.getWorkerMetrics(workerId, startDate, endDate);
      totalUtilization += metrics.utilization_percentage;
      workerCount++;
    }

    const averageUtilization = workerCount > 0 ? totalUtilization / workerCount : 0;
    const totalTime = totalProductiveTime + totalIdleTime;
    const factoryUtilization = totalTime > 0 ? (totalProductiveTime / totalTime) * 100 : 0;
    const averageProductionRate = totalProductiveTime > 0 ? (totalProduction / (totalProductiveTime / 60)) : 0;

    return {
      total_productive_time_minutes: totalProductiveTime,
      total_idle_time_minutes: totalIdleTime,
      total_time_minutes: totalTime,
      total_production_count: totalProduction,
      average_production_rate_units_per_hour: parseFloat(averageProductionRate.toFixed(2)),
      average_utilization_percentage: parseFloat(averageUtilization.toFixed(2)),
      factory_utilization_percentage: parseFloat(factoryUtilization.toFixed(2)),
      active_workers: uniqueWorkers.size,
      active_stations: uniqueStations.size,
      total_events: allEvents.length
    };
  }

  /**
   * Get average confidence score for a worker
   */
  static async getAverageConfidence(workerId, startDate, endDate) {
    const avgResult = await Event.aggregate([
      {
        $match: {
          worker_id: workerId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidence' }
        }
      }
    ]);

    return avgResult.length > 0 ? parseFloat(avgResult[0].avgConfidence.toFixed(3)) : 0;
  }

  /**
   * Get average confidence score for a workstation
   */
  static async getAverageConfidenceStation(stationId, startDate, endDate) {
    const avgResult = await Event.aggregate([
      {
        $match: {
          workstation_id: stationId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidence' }
        }
      }
    ]);

    return avgResult.length > 0 ? parseFloat(avgResult[0].avgConfidence.toFixed(3)) : 0;
  }

  /**
   * Detect duplicate events
   * Events are considered duplicates if they have the same:
   * - worker_id, workstation_id, event_type, and timestamp within 1 second
   */
  static async detectDuplicateEvents() {
    const duplicates = await Event.aggregate([
      {
        $group: {
          _id: {
            worker_id: '$worker_id',
            workstation_id: '$workstation_id',
            event_type: '$event_type',
            timestamp: {
              $toDate: {
                $subtract: [
                  { $toLong: '$timestamp' },
                  { $mod: [{ $toLong: '$timestamp' }, 1000] }
                ]
              }
            }
          },
          count: { $sum: 1 },
          event_ids: { $push: '$_id' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    return duplicates;
  }

  /**
   * Detect out-of-order timestamps
   */
  static async detectOutOfOrderEvents(workerId) {
    const events = await Event.find({ worker_id: workerId }).sort({ timestamp: 1 });
    const issues = [];

    for (let i = 1; i < events.length; i++) {
      if (events[i].timestamp < events[i - 1].timestamp) {
        issues.push({
          worker_id: workerId,
          event1_id: events[i - 1]._id,
          event2_id: events[i]._id,
          time_diff_ms: events[i - 1].timestamp - events[i].timestamp
        });
      }
    }

    return issues;
  }
}

module.exports = MetricsService;
