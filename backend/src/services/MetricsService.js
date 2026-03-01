const Event = require('../models/Event');

// In-memory cache for metrics (5 minute TTL)
const metricsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(type, id, startDate, endDate) {
  return `${type}:${id}:${startDate.getTime()}:${endDate.getTime()}`;
}

function getCachedMetrics(key) {
  const cached = metricsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  metricsCache.delete(key);
  return null;
}

function setCachedMetrics(key, data) {
  metricsCache.set(key, { data, timestamp: Date.now() });
}

class MetricsService {
  /**
   * Get worker metrics using optimized aggregation pipeline
   * Assumptions:
   * - Each "working" event is counted as active time (1 unit = 1 minute by default)
   * - "idle" events represent downtime
   * - "product_count" events accumulate into total units produced
   * - Utilization % = active_time / (active_time + idle_time) * 100
   */
  static async getWorkerMetrics(workerId, startDate, endDate) {
    const cacheKey = getCacheKey('worker', workerId, startDate, endDate);
    const cached = getCachedMetrics(cacheKey);
    if (cached) return cached;

    const results = await Event.aggregate([
      {
        $match: {
          worker_id: workerId,
          timestamp: { $gte: startDate, $lte: endDate },
          event_type: { $in: ['working', 'idle', 'product_count'] }
        }
      },
      {
        $group: {
          _id: '$worker_id',
          total_active_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'working'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          total_idle_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'idle'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          total_units_produced: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'product_count'] }, { $ifNull: ['$count', 0] }, 0]
            }
          },
          working_events_count: {
            $sum: { $cond: [{ $eq: ['$event_type', 'working'] }, 1, 0] }
          },
          idle_events_count: {
            $sum: { $cond: [{ $eq: ['$event_type', 'idle'] }, 1, 0] }
          },
          avg_confidence: { $avg: '$confidence' }
        }
      },
      {
        $project: {
          _id: 0,
          worker_id: '$_id',
          total_active_time_minutes: '$total_active_time',
          total_idle_time_minutes: '$total_idle_time',
          total_time_minutes: { $add: ['$total_active_time', '$total_idle_time'] },
          total_units_produced: '$total_units_produced',
          working_events_count: '$working_events_count',
          idle_events_count: '$idle_events_count',
          utilization_percentage: {
            $cond: [
              { $gt: [{ $add: ['$total_active_time', '$total_idle_time'] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$total_active_time', { $add: ['$total_active_time', '$total_idle_time'] }] },
                      100
                    ]
                  },
                  2
                ]
              },
              0
            ]
          },
          units_per_hour: {
            $cond: [
              { $gt: ['$total_active_time', 0] },
              {
                $round: [
                  { $divide: ['$total_units_produced', { $divide: ['$total_active_time', 60] }] },
                  2
                ]
              },
              0
            ]
          },
          average_confidence: { $round: ['$avg_confidence', 3] }
        }
      }
    ]);

    const metrics = results.length > 0 ? results[0] : {
      worker_id: workerId,
      total_active_time_minutes: 0,
      total_idle_time_minutes: 0,
      total_time_minutes: 0,
      utilization_percentage: 0,
      total_units_produced: 0,
      units_per_hour: 0,
      working_events_count: 0,
      idle_events_count: 0,
      average_confidence: 0
    };

    setCachedMetrics(cacheKey, metrics);
    return metrics;
  }

  /**
   * Get workstation metrics using optimized aggregation pipeline
   * Assumptions:
   * - Occupancy time = sum of all "working" events at the station
   * - Utilization % = occupancy_time / total_available_time * 100 (assuming 8-12 hours per day)
   * - Total units = sum of "product_count" events
   * - Throughput rate = units per hour of operation
   */
  static async getWorkstationMetrics(stationId, startDate, endDate) {
    const cacheKey = getCacheKey('station', stationId, startDate, endDate);
    const cached = getCachedMetrics(cacheKey);
    if (cached) return cached;

    const results = await Event.aggregate([
      {
        $match: {
          workstation_id: stationId,
          timestamp: { $gte: startDate, $lte: endDate },
          event_type: { $in: ['working', 'idle', 'product_count'] }
        }
      },
      {
        $group: {
          _id: '$workstation_id',
          occupancy_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'working'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          idle_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'idle'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          total_units_produced: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'product_count'] }, { $ifNull: ['$count', 0] }, 0]
            }
          },
          working_events_count: {
            $sum: { $cond: [{ $eq: ['$event_type', 'working'] }, 1, 0] }
          },
          unique_workers: { $addToSet: '$worker_id' },
          avg_confidence: { $avg: '$confidence' }
        }
      },
      {
        $project: {
          _id: 0,
          station_id: '$_id',
          occupancy_time_minutes: '$occupancy_time',
          idle_time_minutes: '$idle_time',
          total_time_minutes: { $add: ['$occupancy_time', '$idle_time'] },
          total_units_produced: '$total_units_produced',
          working_events_count: '$working_events_count',
          unique_workers: { $size: '$unique_workers' },
          utilization_percentage: {
            $cond: [
              { $gt: [{ $add: ['$occupancy_time', '$idle_time'] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$occupancy_time', { $add: ['$occupancy_time', '$idle_time'] }] },
                      100
                    ]
                  },
                  2
                ]
              },
              0
            ]
          },
          throughput_rate_units_per_hour: {
            $cond: [
              { $gt: ['$occupancy_time', 0] },
              {
                $round: [
                  { $divide: ['$total_units_produced', { $divide: ['$occupancy_time', 60] }] },
                  2
                ]
              },
              0
            ]
          },
          average_confidence: { $round: ['$avg_confidence', 3] }
        }
      }
    ]);

    const metrics = results.length > 0 ? results[0] : {
      station_id: stationId,
      occupancy_time_minutes: 0,
      idle_time_minutes: 0,
      total_time_minutes: 0,
      utilization_percentage: 0,
      total_units_produced: 0,
      throughput_rate_units_per_hour: 0,
      working_events_count: 0,
      unique_workers: 0,
      average_confidence: 0
    };

    setCachedMetrics(cacheKey, metrics);
    return metrics;
  }

  /**
   * Get factory-level metrics using optimized aggregation pipeline
   * Avoids N+1 problem by calculating all metrics in single pass
   * Assumptions:
   * - Total productive time = sum of all "working" events across all workers
   * - Total production count = sum of all "product_count" events
   * - Average production rate = total units / total working hours
   * - Average utilization = avg of all worker utilization percentages
   */
  static async getFactoryMetrics(startDate, endDate) {
    const cacheKey = getCacheKey('factory', 'all', startDate, endDate);
    const cached = getCachedMetrics(cacheKey);
    if (cached) return cached;

    // Get all worker metrics in one pass
    const workerAggregation = await Event.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          event_type: { $in: ['working', 'idle', 'product_count'] }
        }
      },
      {
        $group: {
          _id: '$worker_id',
          active_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'working'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          idle_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'idle'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          total_time: { $add: ['$active_time', '$idle_time'] },
          utilization: {
            $cond: [
              { $gt: [{ $add: ['$active_time', '$idle_time'] }, 0] },
              { $divide: ['$active_time', { $add: ['$active_time', '$idle_time'] }] },
              0
            ]
          }
        }
      }
    ]);

    // Calculate factory-level aggregates
    const factoryAgg = await Event.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
          event_type: { $in: ['working', 'idle', 'product_count'] }
        }
      },
      {
        $group: {
          _id: null,
          total_productive_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'working'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          total_idle_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'idle'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          total_production: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'product_count'] }, { $ifNull: ['$count', 0] }, 0]
            }
          },
          unique_workers: { $addToSet: '$worker_id' },
          unique_stations: { $addToSet: '$workstation_id' },
          total_events: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          total_productive_time_minutes: '$total_productive_time',
          total_idle_time_minutes: '$total_idle_time',
          total_time_minutes: { $add: ['$total_productive_time', '$total_idle_time'] },
          total_production_count: '$total_production',
          active_workers: { $size: '$unique_workers' },
          active_stations: { $size: '$unique_stations' },
          total_events: '$total_events',
          factory_utilization_percentage: {
            $cond: [
              { $gt: [{ $add: ['$total_productive_time', '$total_idle_time'] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$total_productive_time', { $add: ['$total_productive_time', '$total_idle_time'] }] },
                      100
                    ]
                  },
                  2
                ]
              },
              0
            ]
          },
          average_production_rate_units_per_hour: {
            $cond: [
              { $gt: ['$total_productive_time', 0] },
              {
                $round: [
                  { $divide: ['$total_production', { $divide: ['$total_productive_time', 60] }] },
                  2
                ]
              },
              0
            ]
          }
        }
      }
    ]);

    let result = factoryAgg.length > 0 ? factoryAgg[0] : {
      total_productive_time_minutes: 0,
      total_idle_time_minutes: 0,
      total_time_minutes: 0,
      total_production_count: 0,
      average_production_rate_units_per_hour: 0,
      factory_utilization_percentage: 0,
      active_workers: 0,
      active_stations: 0,
      total_events: 0
    };

    // Calculate average utilization from worker metrics
    if (workerAggregation.length > 0) {
      const avgUtil = workerAggregation.reduce((sum, w) => sum + w.utilization, 0) / workerAggregation.length * 100;
      result.average_utilization_percentage = parseFloat(avgUtil.toFixed(2));
    } else {
      result.average_utilization_percentage = 0;
    }

    setCachedMetrics(cacheKey, result);
    return result;
  }

  /**
   * Batch fetch metrics for multiple items - optimized to avoid N+1 queries
   */
  static async getMultipleWorkerMetrics(workerIds, startDate, endDate) {
    const results = await Event.aggregate([
      {
        $match: {
          worker_id: { $in: workerIds },
          timestamp: { $gte: startDate, $lte: endDate },
          event_type: { $in: ['working', 'idle', 'product_count'] }
        }
      },
      {
        $group: {
          _id: '$worker_id',
          total_active_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'working'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          total_idle_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'idle'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          total_units_produced: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'product_count'] }, { $ifNull: ['$count', 0] }, 0]
            }
          },
          working_events_count: {
            $sum: { $cond: [{ $eq: ['$event_type', 'working'] }, 1, 0] }
          },
          idle_events_count: {
            $sum: { $cond: [{ $eq: ['$event_type', 'idle'] }, 1, 0] }
          },
          avg_confidence: { $avg: '$confidence' }
        }
      },
      {
        $project: {
          _id: 0,
          worker_id: '$_id',
          total_active_time_minutes: '$total_active_time',
          total_idle_time_minutes: '$total_idle_time',
          total_time_minutes: { $add: ['$total_active_time', '$total_idle_time'] },
          total_units_produced: '$total_units_produced',
          working_events_count: '$working_events_count',
          idle_events_count: '$idle_events_count',
          utilization_percentage: {
            $cond: [
              { $gt: [{ $add: ['$total_active_time', '$total_idle_time'] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$total_active_time', { $add: ['$total_active_time', '$total_idle_time'] }] },
                      100
                    ]
                  },
                  2
                ]
              },
              0
            ]
          },
          units_per_hour: {
            $cond: [
              { $gt: ['$total_active_time', 0] },
              {
                $round: [
                  { $divide: ['$total_units_produced', { $divide: ['$total_active_time', 60] }] },
                  2
                ]
              },
              0
            ]
          },
          average_confidence: { $round: ['$avg_confidence', 3] }
        }
      }
    ]);

    return results;
  }

  /**
   * Batch fetch metrics for multiple workstations - optimized to avoid N+1 queries
   */
  static async getMultipleWorkstationMetrics(stationIds, startDate, endDate) {
    const results = await Event.aggregate([
      {
        $match: {
          workstation_id: { $in: stationIds },
          timestamp: { $gte: startDate, $lte: endDate },
          event_type: { $in: ['working', 'idle', 'product_count'] }
        }
      },
      {
        $group: {
          _id: '$workstation_id',
          occupancy_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'working'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          idle_time: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'idle'] }, { $ifNull: ['$duration', 1] }, 0]
            }
          },
          total_units_produced: {
            $sum: {
              $cond: [{ $eq: ['$event_type', 'product_count'] }, { $ifNull: ['$count', 0] }, 0]
            }
          },
          working_events_count: {
            $sum: { $cond: [{ $eq: ['$event_type', 'working'] }, 1, 0] }
          },
          unique_workers: { $addToSet: '$worker_id' },
          avg_confidence: { $avg: '$confidence' }
        }
      },
      {
        $project: {
          _id: 0,
          station_id: '$_id',
          occupancy_time_minutes: '$occupancy_time',
          idle_time_minutes: '$idle_time',
          total_time_minutes: { $add: ['$occupancy_time', '$idle_time'] },
          total_units_produced: '$total_units_produced',
          working_events_count: '$working_events_count',
          unique_workers: { $size: '$unique_workers' },
          utilization_percentage: {
            $cond: [
              { $gt: [{ $add: ['$occupancy_time', '$idle_time'] }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$occupancy_time', { $add: ['$occupancy_time', '$idle_time'] }] },
                      100
                    ]
                  },
                  2
                ]
              },
              0
            ]
          },
          throughput_rate_units_per_hour: {
            $cond: [
              { $gt: ['$occupancy_time', 0] },
              {
                $round: [
                  { $divide: ['$total_units_produced', { $divide: ['$occupancy_time', 60] }] },
                  2
                ]
              },
              0
            ]
          },
          average_confidence: { $round: ['$avg_confidence', 3] }
        }
      }
    ]);

    return results;
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
