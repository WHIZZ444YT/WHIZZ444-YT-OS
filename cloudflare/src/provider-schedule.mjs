const slotMs = 30 * 60 * 1000;
const recentSlots = new Set();

export async function dispatchScheduled(storage, scheduledTime, work, {
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  random = Math.random
} = {}) {
  if (!storage || !Number.isFinite(scheduledTime)) return;
  const slot = Math.floor(scheduledTime / slotMs);
  for (const previous of recentSlots) {
    if (previous < slot - 4) recentSlots.delete(previous);
  }
  if (recentSlots.has(slot)) return;
  recentSlots.add(slot);
  const key = "schedule:dispatch:v1:" + slot;
  try {
    await sleep(Math.floor(random() * 5000));
    if (await storage.get(key)) return;
    await storage.put(key, "started", { expirationTtl: 7200 });
    await work({ slot, slotStart: slot * slotMs });
  } catch {
    console.warn("Scheduled provider dispatch failed");
  }
}

export async function runProviderJobs(jobs) {
  const queue = [...jobs];
  async function run() {
    while (queue.length) {
      const { id, run: job } = queue.shift();
      try {
        await job();
      } catch {
        console.warn("Scheduled provider job failed", id);
      }
    }
  }
  await Promise.all([run(), run()]);
}

export function eligibleEconomicJob(previous, state, ttlSeconds, now) {
  const attempt = Math.max(Date.parse(state?.lastAttemptAt ?? "") || 0,
    Date.parse(previous?.retrievedAt ?? "") || 0);
  const retry = Math.max(Date.parse(state?.retryAt ?? "") || 0,
    Date.parse(state?.circuitOpenUntil ?? "") || 0);
  return retry <= now && now - attempt >= ttlSeconds * 1000;
}
