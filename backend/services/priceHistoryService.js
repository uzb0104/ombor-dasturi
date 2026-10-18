import { isSupabaseConfigured, supabaseClient, readLocalDb, writeLocalDb } from "../lib/db.js";
import { toFePriceHistory } from "../lib/mappers.js";

export async function insertPriceHistoryEntries(entries) {
  if (!entries.length) return;
  if (isSupabaseConfigured) {
    const { error } = await supabaseClient.from("price_history").insert(entries);
    if (error) console.error("❌ price_history insert:", error.message);
  } else {
    const db = readLocalDb();
    if (!db.price_history) db.price_history = [];
    for (const e of entries) {
      db.price_history.unshift({
        id: `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...e,
        created_at: new Date().toISOString(),
      });
    }
    if (db.price_history.length > 5000) db.price_history = db.price_history.slice(0, 5000);
    writeLocalDb(db);
  }
}

export async function recordPriceChanges(productId, productName, before, afterDbObj, user) {
  const uid = user?.id || "system";
  const uname = user?.name || "Tizim";
  const entries = [];
  const pairs = [
    ["buy_price", before?.buy_price, afterDbObj.buy_price],
    ["sell_price", before?.sell_price, afterDbObj.sell_price],
  ];
  for (const [field, oldRaw, newRaw] of pairs) {
    if (newRaw === undefined) continue;
    const oldNum = oldRaw != null && oldRaw !== "" ? Number(oldRaw) : null;
    const newNum = Number(newRaw);
    if (oldNum === newNum) continue;
    if (!before && newNum === 0) continue;
    entries.push({
      product_id: productId,
      product_name: productName,
      field,
      old_value: oldNum,
      new_value: newNum,
      changed_by_id: uid,
      changed_by_name: uname,
    });
  }
  await insertPriceHistoryEntries(entries);
}

export async function fetchPriceHistory(productId, limit = 100) {
  const safeLimit = Math.min(Number(limit) || 100, 500);
  if (isSupabaseConfigured) {
    let q = supabaseClient
      .from("price_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(safeLimit);
    if (productId) q = q.eq("product_id", productId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(toFePriceHistory);
  } else {
    const db = readLocalDb();
    let rows = db.price_history || [];
    if (productId) rows = rows.filter((r) => r.product_id === productId);
    return rows.slice(0, safeLimit).map(toFePriceHistory);
  }
}
