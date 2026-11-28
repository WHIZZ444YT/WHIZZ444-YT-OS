export const RISK_ENGINE_VERSION = "risk-1.0.0";
const MICRO_USD = 1000000n;

export function parseMoneyMicros(value, { optional = false, label = "Amount" } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw && optional) return null;
  const match = /^(\d{1,15})(?:\.(\d{1,6}))?$/.exec(raw);
  if (!match) throw new Error(label + " must be a non-negative decimal with up to six places.");
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] || "").padEnd(6, "0") || "0");
  return whole * MICRO_USD + fraction;
}

function parsePercentBasisPoints(value) {
  const raw = String(value ?? "").trim();
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(raw);
  if (!match) throw new Error("Risk percent must be between 0.01 and 100 with at most two decimal places.");
  return Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0") || "0");
}

function whole(value, label, min, max) {
  if (String(value ?? "").trim() === "") throw new Error(label + " is required.");
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(label + " must be a whole number between " + min + " and " + max + ".");
  return n;
}

export function calculateFuturesPosition(input) {
  const balance = parseMoneyMicros(input.balance, { label: "Account balance" });
  if (balance <= 0n) throw new Error("Account balance must be greater than zero.");
  const riskPercentBps = parsePercentBasisPoints(input.riskPercent);
  if (riskPercentBps < 1 || riskPercentBps > 10000) throw new Error("Risk percent must be between 0.01 and 100.");
  const tickValue = parseMoneyMicros(input.tickValue, { label: "Tick value" });
  if (tickValue <= 0n) throw new Error("Tick value must be greater than zero.");
  const stopTicks = whole(input.stopTicks, "Stop distance", 1, 1000000);
  const targetTicks = whole(input.targetTicks, "Target distance", 1, 1000000);
  const spreadTicks = whole(input.spreadTicks, "Estimated round-turn spread", 0, 1000000);
  const slippageTicks = whole(input.slippageTicks, "Estimated round-turn slippage", 0, 1000000);
  const maxContracts = whole(input.maxContracts, "Maximum contracts", 1, 10000);
  const commission = parseMoneyMicros(input.commissionPerContract, { label: "Round-turn commission and fees" });
  const dailyRemaining = parseMoneyMicros(input.dailyLossRemaining, { optional: true, label: "Daily loss remaining" });
  const drawdownRemaining = parseMoneyMicros(input.drawdownRemaining, { optional: true, label: "Maximum drawdown remaining" });
  const riskBudget = balance * BigInt(riskPercentBps) / 10000n;
  const budgetCaps = [riskBudget, dailyRemaining, drawdownRemaining].filter(v => v !== null);
  const effectiveBudget = budgetCaps.reduce((min, value) => value < min ? value : min);
  const grossStopRisk = BigInt(stopTicks) * tickValue;
  const spreadCost = BigInt(spreadTicks) * tickValue;
  const slippageCost = BigInt(slippageTicks) * tickValue;
  const allInPerContract = grossStopRisk + spreadCost + slippageCost + commission;
  if (allInPerContract <= 0n) throw new Error("Estimated all-in risk per contract must be greater than zero.");
  const affordableContracts = effectiveBudget / allInPerContract;
  const quantity = Number(affordableContracts > BigInt(maxContracts) ? BigInt(maxContracts) : affordableContracts);
  const totalRisk = allInPerContract * BigInt(quantity);
  const grossTarget = BigInt(targetTicks) * tickValue * BigInt(quantity);
  const totalCosts = (spreadCost + slippageCost + commission) * BigInt(quantity);
  const netTarget = grossTarget - totalCosts;
  const netTargetPerContract = BigInt(targetTicks) * tickValue - spreadCost - slippageCost - commission;
  return {
    riskEngineVersion: RISK_ENGINE_VERSION,
    quantity,
    maxContracts,
    riskPercentBps,
    riskBudgetMicros: riskBudget.toString(),
    effectiveBudgetMicros: effectiveBudget.toString(),
    grossStopRiskPerContractMicros: grossStopRisk.toString(),
    commissionPerContractMicros: commission.toString(),
    spreadCostPerContractMicros: spreadCost.toString(),
    slippageCostPerContractMicros: slippageCost.toString(),
    allInRiskPerContractMicros: allInPerContract.toString(),
    totalRiskMicros: totalRisk.toString(),
    grossTargetMicros: grossTarget.toString(),
    estimatedNetTargetMicros: netTarget.toString(),
    netRewardRisk: Number(netTargetPerContract) / Number(allInPerContract),
    riskUtilizationPct: effectiveBudget > 0n ? Number(totalRisk * 10000n / effectiveBudget) / 100 : null,
    constrainedByDailyLoss: dailyRemaining === effectiveBudget,
    constrainedByDrawdown: drawdownRemaining === effectiveBudget,
    constrainedByMaxContracts: affordableContracts > BigInt(maxContracts)
  };
}

export function formatMicros(micros, currency = "USD") {
  const value = BigInt(micros), negative = value < 0n, absolute = negative ? -value : value;
  const wholeAmount = absolute / MICRO_USD;
  const remainder = (absolute % MICRO_USD).toString().padStart(6, "0").replace(/0+$/, "").padEnd(2, "0");
  const wholeFormatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(wholeAmount));
  const prefix = currency === "USD" ? "$" : currency + " ";
  return (negative ? "-" : "") + prefix + wholeFormatted + "." + remainder;
}
