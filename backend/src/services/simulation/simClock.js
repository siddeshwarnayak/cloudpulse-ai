import { env } from "../../config/env.js";

/**
 * SimClock advances a virtual "simulated" timestamp forward every tick,
 * independent of wall-clock Date.now(). This lets us compress e.g. 24
 * simulated hours into ~144 real seconds (multiplier = 10 => 1 real
 * second = 10 simulated minutes) without ever lying about *when* the
 * server thinks "now" is for real-world purposes.
 *
 * The clock starts 24 simulated hours in the past relative to process
 * start, so idle/waste detection (which needs a 24h simulated window)
 * has meaningful history almost immediately after boot instead of
 * requiring the operator to wait hours in real time.
 */
class SimClock {
  constructor() {
    const multiplier = env.SIMULATION_TIME_MULTIPLIER; // simulated minutes per real second
    this.msPerTick = env.METRIC_TICK_INTERVAL_MS;
    this.simulatedMsPerTick = this.msPerTick * multiplier * 60; // real ms -> simulated ms

    const lookbackMs = 24 * 60 * 60 * 1000; // 24 simulated hours
    this._current = new Date(Date.now() - lookbackMs);
  }

  /** Advance the simulated clock by one tick and return the new simulated Date. */
  tick() {
    this._current = new Date(this._current.getTime() + this.simulatedMsPerTick);
    return this._current;
  }

  now() {
    return this._current;
  }
}

export const simClock = new SimClock();
