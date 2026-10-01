type BudgetItem = { amount: number; percentage: number };

function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) throw new Error("At least one channel needs a positive allocation.");
  const exact = weights.map(weight => total * weight / sum);
  const units = exact.map(Math.floor);
  const order = exact.map((value, index) => ({ index, fraction: value - units[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const remaining = total - units.reduce((a, b) => a + b, 0);
  for (let i = 0; i < remaining; i++) units[order[i].index]++;
  return units;
}

export function normalizeBudget<T extends BudgetItem>(totalBudget: number, items: T[]): T[] {
  if (!Number.isFinite(totalBudget) || totalBudget <= 0 || !items.length || items.length > 30) {
    throw new Error("Invalid budget allocation.");
  }
  const weights = items.map(item => {
    if (!Number.isFinite(item.amount) || item.amount < 0) throw new Error("Invalid channel amount.");
    return item.amount;
  });
  const cents = distribute(Math.round(totalBudget * 100), weights);
  const percentages = distribute(10000, cents);
  return items.map((item, index) => ({ ...item, amount: cents[index] / 100, percentage: percentages[index] / 100 }));
}

export function adjustBudget<T extends BudgetItem>(totalBudget: number, items: T[], index: number, percent: number): T[] {
  if (!items[index] || !Number.isFinite(percent)) throw new Error("Invalid channel percentage.");
  if (items.length === 1) return normalizeBudget(totalBudget, [{ ...items[0], amount: totalBudget }]);
  const selected = Math.max(0, Math.min(100, percent));
  const otherTotal = items.reduce((sum, item, i) => sum + (i === index ? 0 : item.amount), 0);
  const updated = items.map((item, i) => ({
    ...item,
    amount: i === index ? totalBudget * selected / 100
      : totalBudget * (100 - selected) / 100 * (otherTotal ? item.amount / otherTotal : 1 / (items.length - 1)),
  }));
  return normalizeBudget(totalBudget, updated);
}
