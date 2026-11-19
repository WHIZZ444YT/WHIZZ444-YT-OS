import test from "node:test";
import assert from "node:assert/strict";
import { calculateFuturesPosition, formatMicros, parseMoneyMicros } from "../assets/futures-risk-engine.mjs";

const base = overrides => ({
  balance: "10000.00", riskPercent: "1.00", tickValue: "0.50",
  stopTicks: 20, targetTicks: 60, commissionPerContract: "4.00",
  spreadTicks: 0, slippageTicks: 2, maxContracts: 10,
  dailyLossRemaining: "", drawdownRemaining: "", ...overrides
});

test("fixed-point USD parsing preserves micro-dollar precision", () => {
  assert.equal(parseMoneyMicros("12.345678"), 12345678n);
  assert.equal(formatMicros("12345678"), "$12.345678");
  assert.throws(() => parseMoneyMicros("1.1234567"), /up to six places/);
});

test("all-in risk includes stop, round-turn fees, spread and slippage, with whole-size flooring", () => {
  const result = calculateFuturesPosition(base({ spreadTicks: 1 }));
  assert.equal(result.quantity, 6);
  assert.equal(formatMicros(result.grossStopRiskPerContractMicros), "$10.00");
  assert.equal(formatMicros(result.commissionPerContractMicros), "$4.00");
  assert.equal(formatMicros(result.spreadCostPerContractMicros), "$0.50");
  assert.equal(formatMicros(result.slippageCostPerContractMicros), "$1.00");
  assert.equal(formatMicros(result.allInRiskPerContractMicros), "$15.50");
  assert.equal(formatMicros(result.totalRiskMicros), "$93.00");
  assert.equal(result.quantity * 15.5 <= 100, true);
});

test("daily-loss and drawdown remaining amounts cap the risk budget", () => {
  const result = calculateFuturesPosition(base({ dailyLossRemaining: "50", drawdownRemaining: "40" }));
  assert.equal(formatMicros(result.effectiveBudgetMicros), "$40.00");
  assert.equal(result.quantity, 2);
  assert.equal(result.constrainedByDailyLoss, true);
  assert.equal(result.constrainedByDrawdown, true);
});

test("zero-contract result is explicit when a single contract exceeds the budget", () => {
  const result = calculateFuturesPosition(base({ balance: "100", tickValue: "12.50", stopTicks: 20 }));
  assert.equal(result.quantity, 0);
  assert.equal(formatMicros(result.totalRiskMicros), "$0.00");
});

test("input validation rejects negative allowances, fractional ticks and oversized caps", () => {
  assert.throws(() => calculateFuturesPosition(base({ dailyLossRemaining: "-1" })), /non-negative decimal/);
  assert.throws(() => calculateFuturesPosition(base({ stopTicks: 1.5 })), /whole number/);
  assert.throws(() => calculateFuturesPosition(base({ maxContracts: 10001 })), /whole number/);
  assert.throws(() => calculateFuturesPosition(base({ riskPercent: "0" })), /between 0.01 and 100/);
});
