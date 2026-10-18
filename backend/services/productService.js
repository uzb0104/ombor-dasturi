import {
  isSupabaseConfigured,
  supabaseClient,
  readLocalDb,
  writeLocalDb,
  clearCached,
} from "../lib/db.js";
import { toDbProduct } from "../lib/mappers.js";
import { recordPriceChanges } from "./priceHistoryService.js";

export async function safeSupabaseProductUpsert(operation, id, dbObj) {
  let curObj = { ...dbObj };
  // 1-urinish: to'liq ma'lumotlar bilan
  let res =
    operation === "insert"
      ? await supabaseClient.from("products").insert([curObj]).select().single()
      : await supabaseClient.from("products").update(curObj).eq("id", id).select().single();

  if (!res.error) return res;

  console.warn(`⚠️ [Products ${operation}] 1-urinish xatosi:`, res.error.message);

  // 1. Agar xatolik vehicle foreign key yoki vehicle constraint bilan bog'liq bo'lsa
  if (
    res.error &&
    (res.error.message?.includes("foreign key") ||
      res.error.message?.includes("products_vehicle") ||
      res.error.message?.includes("vehicle_brands") ||
      res.error.message?.includes("vehicle"))
  ) {
    console.warn("⚠️ Vehicle constraint xatosi, vehicle=null qilib qayta urinilmoqda...");
    curObj = { ...curObj, vehicle: null };
    res =
      operation === "insert"
        ? await supabaseClient.from("products").insert([curObj]).select().single()
        : await supabaseClient.from("products").update(curObj).eq("id", id).select().single();
    if (!res.error) return res;
  }

  // 2. Agar xatolik mavjud bo'lmagan ustunlar bilan bog'liq bo'lsa
  const nonStandardCols = [
    "buy_price_usd",
    "sell_price_usd",
    "currency",
    "vehicles",
    "branch_stock",
  ];
  for (const col of nonStandardCols) {
    delete curObj[col];
  }

  res =
    operation === "insert"
      ? await supabaseClient.from("products").insert([curObj]).select().single()
      : await supabaseClient.from("products").update(curObj).eq("id", id).select().single();

  if (!res.error) return res;

  // 3. Oxirgi xavfsiz urinish: vehicle ni ham null qilish
  if (curObj.vehicle !== null) {
    curObj.vehicle = null;
    res =
      operation === "insert"
        ? await supabaseClient.from("products").insert([curObj]).select().single()
        : await supabaseClient.from("products").update(curObj).eq("id", id).select().single();
  }

  return res;
}

export async function findExistingProduct(name, vehicle) {
  if (!name) return null;
  if (isSupabaseConfigured) {
    let query = supabaseClient.from("products").select("*").ilike("name", name.trim());
    if (vehicle) {
      query = query.eq("vehicle", vehicle);
    }
    const { data: matched } = await query.limit(1).maybeSingle();
    return matched;
  } else {
    const db = readLocalDb();
    const pName = name.trim().toLowerCase();
    const pVeh = (vehicle || "").trim().toLowerCase();
    return (
      (db.products || []).find(
        (item) =>
          (item.name || "").trim().toLowerCase() === pName &&
          (item.vehicle || "").trim().toLowerCase() === pVeh,
      ) || null
    );
  }
}

export async function bulkImportProducts(items, user) {
  const result = { created: 0, failed: 0, errors: [] };

  if (isSupabaseConfigured) {
    try {
      const rows = items.map((raw) => {
        const product = { ...raw, id: raw.id || `prd_${Math.random().toString(36).slice(2, 9)}` };
        if (!product.name) throw new Error("Nomi majburiy");
        return toDbProduct(product);
      });
      for (let index = 0; index < rows.length; index += 500) {
        let chunk = rows.slice(index, index + 500);
        let { error } = await supabaseClient.from("products").upsert(chunk, { onConflict: "id" });
        if (
          error &&
          (error.message?.includes("foreign key") ||
            error.message?.includes("products_vehicle") ||
            error.message?.includes("vehicle_brands"))
        ) {
          console.warn(
            "⚠️ Foreign key error during bulk upsert, retrying without vehicle string...",
          );
          chunk = chunk.map((r) => ({ ...r, vehicle: null }));
          const retryFk = await supabaseClient.from("products").upsert(chunk, { onConflict: "id" });
          error = retryFk.error;
        }
        if (error) throw error;
      }
      await clearCached("cache:products");
      return { created: rows.length, failed: 0, errors: [] };
    } catch (error) {
      return { created: 0, failed: items.length, errors: [{ error: error.message }] };
    }
  }

  for (const raw of items) {
    try {
      const p = { ...raw };
      if (!p.id) p.id = `prd_${Math.random().toString(36).slice(2, 9)}`;
      if (!p.name) throw new Error("Nomi majburiy");

      const db = readLocalDb();
      const idx = db.products.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const beforeDb = toDbProduct(db.products[idx]);
        db.products[idx] = { ...db.products[idx], ...p };
        await recordPriceChanges(p.id, p.name, beforeDb, toDbProduct(p), user);
      } else {
        db.products.unshift(p);
        await recordPriceChanges(p.id, p.name, null, toDbProduct(p), user);
      }
      writeLocalDb(db);
      result.created++;
    } catch (e) {
      result.failed++;
      result.errors.push({ name: raw.name || raw.id, error: e.message });
    }
  }

  await clearCached("cache:products");
  return result;
}
