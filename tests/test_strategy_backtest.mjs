import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
globalThis.crypto ??= webcrypto;

import {
  ENGINE_VERSION, parseSignalCsv, validateConfig, runBacktest, runExperiment
} from "../assets/strategy-backtest-engine.mjs";

const config = overrides => ({
  strategyName: "P4 deterministic fixture",
  modelId: "custom",
  marketSymbol: "ESH6",
  timeframe: "5m",
  timezone: "UTC",
  dataSource: "Synthetic unit fixture",
  datasetId: "strategy-lab-fixture-v1",
  downloadDate: "2026-01-02",
  volumeUnits: "contracts",
  costSource: "Synthetic fixture assumptions",
  costAsOf: "2026-01-02",
  seriesType: "single-expiry",
  rollNote: "",
  signalSourceNotes: "Signals known at candle close; synthetic fixture.",
  startingCapital: 25000,
  riskPercent: 1,
  maxContracts: 5,
  tickSize: 0.25,
  tickValue: 12.5,
  commissionPerSide: 2,
  slippageTicks: 0,
  stopTicks: 10,
  targetRR: 2,
  maxBarsInTrade: 2,
  trainPercent: 60,
  validationPercent: 20,
  ...overrides
});

function makeBar(index, values = {}) {
  const epoch = Date.parse("2026-01-01T00:00:00.000Z") + index * 300000;
  return {
    timestamp: new Date(epoch).toISOString(), epoch,
    open: 100, high: 100.5, low: 99.5, close: 100,
    signal: 0, stopTicks: null, volume: 100, contract: "ESH6",
    ...values
  };
}
function sampleCsv({signals = {3:"LONG",21:"SHORT",27:"LONG"}, count = 30} = {}) {
  const rows=["timestamp,open,high,low,close,signal,contract,expiry,stop_ticks,volume"];
  for(let i=0;i<count;i+=1){
    const epoch=Date.parse("2026-01-01T00:00:00.000Z")+i*300000;
    rows.push([
      new Date(epoch).toISOString(), "100.00","100.50","99.50","100.00",
      signals[i]||"FLAT", "ESH6", "2026-03-20", "", "100"
    ].join(","));
  }
  return rows.join("\n");
}

test("engine has a stable explicit version", () => {
  assert.equal(ENGINE_VERSION, "p7.1.0");
});

test("CSV parser validates OHLC, timezone, sort order and one contract", () => {
  const parsed=parseSignalCsv(sampleCsv());
  assert.equal(parsed.quality.rows,30);
  assert.equal(parsed.quality.signalCount,3);
  assert.equal(parsed.quality.longSignals,2);
  assert.equal(parsed.quality.shortSignals,1);
  assert.equal(parsed.quality.contract,"ESH6");
  assert.equal(parsed.quality.expiry,"2026-03-20");
  assert.throws(()=>parseSignalCsv(sampleCsv().replace("2026-01-01T00:00:00.000Z","2026-01-01T00:00:00")),/explicit UTC offset/);
  const outOfOrder=sampleCsv().replace(
    "2026-01-01T00:05:00.000Z,100.00",
    "2026-01-01T00:00:00.000Z,100.00"
  );
  assert.throws(()=>parseSignalCsv(outOfOrder),/strictly increasing/);
  const badOhlc=sampleCsv().replace("100.00,100.50,99.50,100.00","100.00,98.00,99.50,100.00");
  assert.throws(()=>parseSignalCsv(badOhlc),/OHLC range is inconsistent/);
  const mixed=sampleCsv().replaceAll("ESH6","ESM6");
  const mixedTwo=mixed.replace("2026-01-01T00:05:00.000Z,100.00,100.50,99.50,100.00,FLAT,ESM6","2026-01-01T00:05:00.000Z,100.00,100.50,99.50,100.00,FLAT,ESH6");
  assert.throws(()=>parseSignalCsv(mixedTwo),/multiple contract codes/);
  assert.throws(()=>parseSignalCsv(sampleCsv().replace("ESH6,2026-03-20","ESH6,2026-06-19")),/multiple expiry dates/);
  assert.throws(()=>parseSignalCsv(sampleCsv().replace("ESH6,2026-03-20","ESH6,2026-13-40")),/exact YYYY-MM-DD/);
});

function datedCsv(timestamp, signalAvailableAt = timestamp) {
  const [header, ...data] = sampleCsv({ signals: { 0: "LONG" } }).split("\n");
  const rows = data.map((line, index) => {
    const minute = String(index).padStart(2, "0");
    return timestamp.replace("MM", minute) + line.slice(line.indexOf(",")) +
      "," + signalAvailableAt.replace("MM", minute);
  });
  return [header + ",signal_available_at", ...rows].join("\n");
}

test("CSV parser rejects impossible civil dates in each timestamp column", () => {
  assert.throws(
    () => parseSignalCsv(datedCsv("2026-02-30T00:MM:00Z")),
    /Invalid timestamp at CSV row 2\./
  );
  assert.throws(
    () => parseSignalCsv(datedCsv("2026-03-02T00:MM:00Z", "2026-02-30T00:MM:00Z")),
    /Invalid signal_available_at at CSV row 2\./
  );
  assert.throws(
    () => parseSignalCsv(datedCsv("2026-02-29T00:MM:00+05:30")),
    /Invalid timestamp at CSV row 2\./
  );
  assert.throws(
    () => parseSignalCsv(datedCsv("2026-05-01T00:MM:00Z", "2026-04-31T00:MM:00-04:00")),
    /Invalid signal_available_at at CSV row 2\./
  );
});

test("CSV parser preserves valid dates and applies explicit offsets after calendar validation", () => {
  const february = parseSignalCsv(datedCsv("2026-02-28T00:MM:00Z"));
  assert.equal(february.quality.rows, 30);
  assert.equal(february.quality.firstTimestamp, "2026-02-28T00:00:00.000Z");
  const leapDay = parseSignalCsv(datedCsv(
    "2028-02-29T00:MM:00+05:30", "2028-02-28 18:MM:00+00:00"
  ));
  assert.equal(leapDay.quality.firstTimestamp, "2028-02-28T18:30:00.000Z");
  assert.equal(leapDay.quality.timedSignalCount, 1);
});

test("CSV parser rejects missing/duplicate columns and bad signals", () => {
  assert.throws(()=>parseSignalCsv("timestamp,open,high,low,close\n2026-01-01T00:00:00Z,1,1,1,1"),/missing required columns/);
  assert.throws(()=>parseSignalCsv(sampleCsv().replace("timestamp,open","timestamp,timestamp")),/duplicate column/);
  assert.throws(()=>parseSignalCsv(sampleCsv().replace(",LONG,",",MAYBE,")),/Unsupported signal/);
  assert.throws(()=>parseSignalCsv(sampleCsv({count:29})),/At least 30/);
});

test("configuration rejects invalid timezone, split and continuous roll metadata", () => {
  assert.throws(()=>validateConfig(config({timezone:"Not/A_Timezone"})),/valid IANA timezone/);
  assert.throws(()=>validateConfig(config({trainPercent:80,validationPercent:11})),/at least 10%/);
  assert.throws(()=>validateConfig(config({seriesType:"back-adjusted-continuous"})),/not supported/);
  assert.throws(()=>validateConfig(config({modelId:"unlisted-detector"})),/does not generate an ICT signal/);
});

test("next-bar entry and target fills use costs and return net expectancy", () => {
  const bars=[
    makeBar(0,{signal:1}),
    makeBar(1,{open:100,high:102,low:99,close:101}),
    makeBar(2,{open:104,high:106,low:103,close:105})
  ];
  const result=runBacktest(bars,config(),"train");
  assert.equal(result.trades.length,1);
  const trade=result.trades[0];
  assert.equal(trade.entryAt,bars[1].timestamp);
  assert.equal(trade.exitAt,bars[2].timestamp);
  assert.equal(trade.exitReason,"target-limit");
  assert.equal(trade.quantity,1);
  assert.equal(trade.grossPnlUsd,250);
  assert.equal(trade.commissionsUsd,4);
  assert.equal(trade.netPnlUsd,246);
  assert.equal(result.metrics.expectancyUsdPerTrade,246);
  assert.equal(result.metrics.profitFactorState,"no-losses");
  assert.ok(Math.abs(result.metrics.averageR-1.907)<0.000001);
});

test("same-bar stop and target collision uses conservative stop-first policy", () => {
  const bars=[
    makeBar(0,{signal:1}),
    makeBar(1,{open:100,high:106,low:97,close:101}),
    makeBar(2)
  ];
  const result=runBacktest(bars,config(),"train");
  assert.equal(result.trades.length,1);
  assert.equal(result.trades[0].exitReason,"stop-first-same-bar");
  assert.equal(result.trades[0].exitPrice,97.5);
  assert.equal(result.trades[0].netPnlUsd,-129);
  assert.equal(result.ambiguousBars,1);
  assert.ok(result.warnings.some(w=>w.includes("stop-first")));
});

test("stop gaps fill at the worse opening price plus slippage", () => {
  const bars=[
    makeBar(0,{signal:1}),
    makeBar(1,{open:100,high:101,low:99,close:100}),
    makeBar(2,{open:95,high:96,low:94,close:95})
  ];
  const result=runBacktest(bars,config({slippageTicks:1}),"train");
  const trade=result.trades[0];
  assert.equal(trade.exitReason,"stop-gap");
  assert.equal(trade.exitPrice,94.75);
  assert.equal(trade.netPnlUsd,-279);
});

test("whole-contract risk sizing skips trades that exceed the budget", () => {
  const bars=[makeBar(0,{signal:1}),makeBar(1),makeBar(2)];
  const result=runBacktest(bars,config({startingCapital:100}),"train");
  assert.equal(result.trades.length,0);
  assert.equal(result.skippedSignals,1);
  assert.ok(result.warnings.some(w=>w.includes("skipped")));
});

test("position time exit closes after the configured maximum bars", () => {
  const bars=[makeBar(0,{signal:1}),makeBar(1),makeBar(2),makeBar(3)];
  const result=runBacktest(bars,config({maxBarsInTrade:1}),"train");
  assert.equal(result.trades.length,1);
  assert.equal(result.trades[0].exitReason,"time-exit");
  assert.equal(result.trades[0].barsHeld,1);
});

test("risk metrics distinguish gross P&L from net profit factor", () => {
  const bars=[
    makeBar(0,{signal:1}),
    makeBar(1,{open:100,high:106,low:99,close:105}),
    makeBar(2,{open:100,high:101,low:97,close:98}),
    makeBar(3,{signal:-1}),
    makeBar(4,{open:100,high:101,low:99,close:100}),
    makeBar(5,{open:100,high:106,low:99,close:104})
  ];
  const result=runBacktest(bars,config({commissionPerSide:0}),"train");
  assert.ok(result.metrics.maxDrawdownUsd>=0);
  assert.ok(result.equityCurve.every(x=>Number.isFinite(x.equity)));
  assert.equal(result.metrics.profitFactorBasis.startsWith("Net winning trades"),true);
  assert.ok(Array.isArray(result.metrics.winRate95PctInterval));
});

test("metrics include payoff ratio and longest consecutive win/loss runs", () => {
  const bars=[
    makeBar(0,{signal:1}),
    makeBar(1,{high:101,low:97,close:99}),
    makeBar(2,{signal:-1}),
    makeBar(3,{high:104,low:99,close:103}),
    makeBar(4,{signal:1}),
    makeBar(5,{high:106,low:99,close:105}),
    makeBar(6,{signal:1}),
    makeBar(7,{high:106,low:99,close:105})
  ];
  const result=runBacktest(bars,config({slippageTicks:0,commissionPerSide:0,maxBarsInTrade:10}),"metrics");
  assert.equal(result.metrics.trades,4);
  assert.equal(result.metrics.maxConsecutiveLosses,2);
  assert.equal(result.metrics.maxConsecutiveWins,2);
  assert.equal(result.metrics.tradesPer1000Bars,500);
  assert.ok(result.metrics.averageWinLossRatio>0);
});

test("chronological experiment split has independent train, validation and OOS", async () => {
  const csv=sampleCsv();
  const run=await runExperiment(csv,config(),"fixture.csv");
  assert.equal(run.splits.length,3);
  assert.deepEqual(run.splits.map(x=>x.key),["in-sample","validation","out-of-sample"]);
  assert.equal(run.splits[0].bars,18);
  assert.equal(run.splits[1].bars,6);
  assert.equal(run.splits[2].bars,6);
  assert.equal(run.splits[2].trades.length,1);
  assert.equal(run.manifest.method.entry,"next-bar-open");
  assert.match(run.manifest.dataset.sha256,/^[a-f0-9]{64}$/);
  assert.match(run.manifest.runFingerprint,/^[a-f0-9]{64}$/);
  const again=await runExperiment(csv,config(),"fixture.csv");
  assert.equal(run.manifest.runFingerprint,again.manifest.runFingerprint);
  assert.equal(run.manifest.schemaVersion,3);
  assert.equal(run.manifest.dataset.exactExpiryDate,"2026-03-20");
  assert.equal(run.manifest.dataset.dataSource,"Synthetic unit fixture");
  assert.ok(run.warnings.some(w=>w.includes("fewer than 30 closed trades")));
});

test("experiment records timestamp discontinuities without treating them as empty bars", async () => {
  const lines=sampleCsv().split("\n");
  for(let i=1;i<lines.length;i+=1){
    const cells=lines[i].split(",");
    const epoch=Date.parse(cells[0])+(i>=5?300000:0);
    cells[0]=new Date(epoch).toISOString();
    lines[i]=cells.join(",");
  }
  const run=await runExperiment(lines.join("\n"),config());
  assert.equal(run.quality.observedGapCount,1);
  assert.equal(run.quality.observedGaps.length,1);
  assert.ok(run.warnings.some(w=>w.includes("timestamp gap")));
});

test("CSV inputs with mixed unadjusted expiries are refused rather than stitched", () => {
  const csv=sampleCsv().replace("FLAT,ESH6,2026-03-20","FLAT,ESM6,2026-03-20");
  assert.throws(()=>parseSignalCsv(csv),/multiple contract codes/);
});

test("CSV rejects future-derived or unreviewed columns", () => {
  const csv=sampleCsv().replace("volume\n","volume,future_signal\n").replace(/,100$/gm,",100,LONG");
  assert.throws(()=>parseSignalCsv(csv),/unsupported columns.*future_signal/i);
});

test("experiment enforces exact contract, verified tick alignment and volume units", async () => {
  await assert.rejects(()=>runExperiment(sampleCsv(),config({marketSymbol:"ES"})),/must match the exact contract code/);
  await assert.rejects(()=>runExperiment(sampleCsv().replace("100.00,100.50","100.10,100.50"),config()),/do not align to the supplied tick size/);
  await assert.rejects(()=>runExperiment(sampleCsv(),config({volumeUnits:""})),/Enter their source units/);
});

test("point-in-time signals require evidence and reject release times after bar close", async () => {
  const csv = sampleCsv();
  const opts = { ...config(), signalTiming: "point-in-time" };
  await assert.rejects(runExperiment(csv, opts), /signal_available_at on every non-flat/);
  const timed = csv.trimEnd().split("\n").map((line, index) => {
    if (!index) return line + ",signal_available_at";
    const [timestamp,,,,,signal] = line.split(",");
    return line + "," + (signal === "FLAT" ? "" : timestamp);
  }).join("\n");
  const result = await runExperiment(timed, opts);
  assert.equal(result.quality.timedSignalCount, result.quality.signalCount);
  assert.equal(result.manifest.dataset.signalTiming, "point-in-time");
  const late = timed.replace(/,(\d{4}-\d{2}-\d{2}T[^,\n]+Z)$/m, ",2026-12-31T00:00:00Z");
  assert.throws(() => parseSignalCsv(late), /after the source bar close/);
});

test("duplicate bars and missing dataset permissions fail closed", async () => {
  const lines = sampleCsv().split("\n");
  lines[2] = lines[1];
  assert.throws(() => parseSignalCsv(lines.join("\n")), /duplicate or out-of-order/);
  const csv = sampleCsv();
  const provenance = { ...config(), sessionCalendar: "Synthetic UTC grid",
    rights: { research: true, reference: "fixture-v1", persist: false, export: false } };
  const run = await runExperiment(csv, provenance);
  assert.equal(run.manifest.dataset.sessionCalendar, "Synthetic UTC grid");
  assert.equal(run.manifest.dataset.rollMethod, null);
  assert.equal(run.manifest.dataset.rights.export, false);
  assert.equal((await runExperiment(csv, provenance)).manifest.runFingerprint, run.manifest.runFingerprint);
  await assert.rejects(runExperiment(csv, { ...provenance, rights: {} }), /permission for local research/);
});

test("split boundaries prevent a late training signal from entering validation and track drawdown", async () => {
  const boundary = await runExperiment(sampleCsv({signals:{17:"LONG"}}), config());
  assert.equal(boundary.splits[0].trades.length, 0);
  assert.equal(boundary.splits[1].trades.length, 0);
  assert.ok(boundary.manifest.split.periods[0].endAt < boundary.manifest.split.periods[1].startAt);
  const loss = runBacktest([makeBar(0,{signal:1}),makeBar(1,{low:97}),makeBar(2)],config());
  assert.ok(loss.metrics.maxDrawdownUsd > 0);
});
