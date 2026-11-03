/**
 * Background email worker.
 *
 * Loop: recover jobs abandoned by crashed workers -> claim due jobs ->
 * send each through Resend -> record sent / retry / failed -> wait -> repeat.
 *
 * Several workers can run at the same time: jobs are claimed with
 * FOR UPDATE SKIP LOCKED, so each job is processed by exactly one worker.
 */
const os = require('node:os');
const crypto = require('node:crypto');
const config = require('../config');
const { emailJobService } = require('../services');

function createEmailWorker({
  pollIntervalMs = config.worker.pollIntervalMs,
  batchSize = config.worker.batchSize,
  deliver, // optional override, used by tests
  logger = console,
} = {}) {
  const workerId = `${os.hostname()}-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;
  let running = false;
  let timer = null;
  let currentCycle = null;

  const log = (message) => logger.log(`[email-worker ${workerId}] ${message}`);

  /** One polling cycle. Errors are logged, never thrown, so the loop survives. */
  async function runOnce() {
    try {
      const released = await emailJobService.recoverStaleJobs();
      if (released > 0) log(`released ${released} stale job(s) from crashed workers`);

      const summary = await emailJobService.processDueJobs({ workerId, batchSize, deliver, log });
      return summary;
    } catch (error) {
      // e.g. database temporarily unavailable — try again on the next cycle.
      logger.error(`[email-worker ${workerId}] cycle failed: ${error.message}`);
      return null;
    }
  }

  /** Runs the next cycle after `delayMs`, then schedules the one after it. */
  function scheduleNext(delayMs) {
    if (!running) return;
    timer = setTimeout(async () => {
      currentCycle = runOnce();
      const summary = await currentCycle;
      currentCycle = null;
      // A full batch means more jobs may be waiting: continue immediately.
      const moreWork = summary !== null && summary.claimed === batchSize;
      scheduleNext(moreWork ? 0 : pollIntervalMs);
    }, delayMs);
  }

  function start() {
    if (running) return;
    running = true;
    log(`started (poll every ${pollIntervalMs}ms, batch size ${batchSize})`);
    scheduleNext(0);
  }

  /** Stops polling and waits for the current cycle to finish. */
  async function stop() {
    running = false;
    clearTimeout(timer);
    if (currentCycle) await currentCycle;
    log('stopped');
  }

  return { workerId, start, stop, runOnce };
}

module.exports = { createEmailWorker };
