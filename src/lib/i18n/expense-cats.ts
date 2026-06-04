/** Xarajat kategoriyasi (ma'lumotlar bazasida saqlanadigan qiymat) → tarjima kaliti */
export const EXPENSE_CAT_VALUES = [
  "Ish haqi",
  "Soliq",
  "Transport",
  "Elektr",
  "Ombor ijarasi",
  "Ta'mirlash",
  "Internet",
  "Boshqa",
] as const;

export const EXPENSE_CAT_KEYS: Record<string, string> = {
  "Ish haqi": "expenses.cat.salary",
  Soliq: "expenses.cat.tax",
  Transport: "expenses.cat.transport",
  Elektr: "expenses.cat.electric",
  "Ombor ijarasi": "expenses.cat.rent",
  "Ta'mirlash": "expenses.cat.repair",
  Internet: "expenses.cat.internet",
  Boshqa: "expenses.cat.other",
};

export function expenseCategoryLabel(t: (key: string) => string, category: string): string {
  const key = EXPENSE_CAT_KEYS[category];
  return key ? t(key) : category;
}
