import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import sequelize from '../config/database.js';
import os from 'os';
import logger from '../utils/logger.js';

const router = express.Router();
router.use(authenticate);

// ─── Single raw SQL that returns ALL counts in one round-trip ─────────────────
const COUNTS_SQL = `
  SELECT
    (SELECT COUNT(*) FROM users          WHERE deleted_at IS NULL) AS users,
    (SELECT COUNT(*) FROM branches       WHERE deleted_at IS NULL) AS branches,
    (SELECT COUNT(*) FROM vehicles       WHERE deleted_at IS NULL) AS vehicles,
    (SELECT COUNT(*) FROM contacts       WHERE deleted_at IS NULL) AS contacts,
    (SELECT COUNT(*) FROM appointments   WHERE deleted_at IS NULL) AS appointments,
    (SELECT COUNT(*) FROM helpdesk_tickets WHERE deleted_at IS NULL) AS tickets,
    (SELECT COUNT(*) FROM leads          WHERE deleted_at IS NULL) AS leads,
    (SELECT COUNT(*) FROM phone_calls    WHERE deleted_at IS NULL) AS phone_calls,
    (SELECT COUNT(*) FROM helpdesk_tickets WHERE deleted_at IS NULL AND status IN ('open','in_progress','pending')) AS open_tickets,
    (SELECT COUNT(*) FROM appointments   WHERE deleted_at IS NULL AND DATE(appointment_date) = CURRENT_DATE) AS today_appointments,
    (SELECT COUNT(*) FROM vehicles       WHERE deleted_at IS NULL AND status = 'available') AS active_vehicles
`;

router.get('/status', async (req, res) => {
  const startTime = Date.now();

  try {
    // ── Run DB ping + counts in parallel ──────────────────────────────────
    const [pingResult, countsResult] = await Promise.all([
      // DB ping
      (async () => {
        const t = Date.now();
        try {
          await sequelize.query('SELECT 1', { type: sequelize.QueryTypes.SELECT });
          return { status: 'healthy', latency: Date.now() - t, error: null };
        } catch (e) {
          logger.error('DB ping failed:', e);
          return { status: 'error', latency: null, error: e.message };
        }
      })(),

      // All counts in a single query
      sequelize.query(COUNTS_SQL, { type: sequelize.QueryTypes.SELECT })
        .then(rows => rows[0])
        .catch(() => ({})),
    ]);

    // ── Parse counts (all come back as strings from pg) ───────────────────
    const n = (v) => parseInt(v || '0', 10);
    const c = countsResult;

    // ── OS / process info (synchronous — zero latency) ────────────────────
    const totalMem = os.totalmem();
    const freeMem  = os.freemem();
    const usedMem  = totalMem - freeMem;
    const procMem  = process.memoryUsage();
    const loadAvg  = os.loadavg();
    const cpus     = os.cpus();

    const apiLatency = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        overall: pingResult.status === 'error' ? 'degraded' : 'operational',
        timestamp: new Date().toISOString(),
        api_latency_ms: apiLatency,

        database: {
          status:     pingResult.status,
          latency_ms: pingResult.latency,
          dialect:    'PostgreSQL',
          error:      pingResult.error,
        },

        stats: {
          users:              n(c.users),
          branches:           n(c.branches),
          vehicles:           n(c.vehicles),
          contacts:           n(c.contacts),
          appointments:       n(c.appointments),
          tickets:            n(c.tickets),
          leads:              n(c.leads),
          phone_calls:        n(c.phone_calls),
          open_tickets:       n(c.open_tickets),
          today_appointments: n(c.today_appointments),
          active_vehicles:    n(c.active_vehicles),
        },

        server: {
          uptime_seconds: Math.floor(process.uptime()),
          node_version:   process.version,
          platform:       os.platform(),
          arch:           os.arch(),
          hostname:       os.hostname(),
          cpu_model:      cpus[0]?.model || 'Unknown',
          cpu_count:      cpus.length,
          load_avg_1m:    Math.round(loadAvg[0] * 100) / 100,
          load_avg_5m:    Math.round(loadAvg[1] * 100) / 100,
          load_avg_15m:   Math.round(loadAvg[2] * 100) / 100,
        },

        memory: {
          total_mb:      Math.round(totalMem / 1024 / 1024),
          used_mb:       Math.round(usedMem  / 1024 / 1024),
          free_mb:       Math.round(freeMem  / 1024 / 1024),
          usage_pct:     Math.round((usedMem / totalMem) * 100),
          heap_used_mb:  Math.round(procMem.heapUsed  / 1024 / 1024),
          heap_total_mb: Math.round(procMem.heapTotal / 1024 / 1024),
          rss_mb:        Math.round(procMem.rss        / 1024 / 1024),
        },

        services: [
          { name: 'REST API',       status: 'operational', latency_ms: apiLatency        },
          { name: 'Database',       status: pingResult.status === 'healthy' ? 'operational' : 'error', latency_ms: pingResult.latency },
          { name: 'Authentication', status: 'operational', latency_ms: null              },
          { name: 'File Storage',   status: 'operational', latency_ms: null              },
        ],
      },
    });

  } catch (error) {
    logger.error('System status error:', error);
    res.status(500).json({
      success: false,
      data: {
        overall:   'error',
        timestamp: new Date().toISOString(),
        error:     error.message,
      },
    });
  }
});

export default router;
