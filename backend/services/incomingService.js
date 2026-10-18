import {
  isSupabaseConfigured,
  supabaseClient,
  readLocalDb,
  writeLocalDb,
  clearCached,
} from "../lib/db.js";

export async function adjustSupplierDebtSafe(supplierId, delta) {
  if (!supplierId || !delta) return;
  if (isSupabaseConfigured) {
    try {
      await supabaseClient.rpc("adjust_supplier_debt", {
        s_id: supplierId,
        delta,
      });
    } catch {
      const { data: s } = await supabaseClient
        .from("suppliers")
        .select("debt")
        .eq("id", supplierId)
        .single();
      if (s) {
        await supabaseClient
          .from("suppliers")
          .update({ debt: Math.max(0, (s.debt || 0) + delta) })
          .eq("id", supplierId);
      }
    }
  } else {
    const db = readLocalDb();
    db.suppliers = (db.suppliers || []).map((s) =>
      s.id === supplierId ? { ...s, debt: Math.max(0, (s.debt || 0) + delta) } : s,
    );
    writeLocalDb(db);
  }
}

export async function applyIncomingBatch(ids) {
  const idSet = new Set(ids);
  let appliedCount = 0;

  if (isSupabaseConfigured) {
    const { data: items, error: fetchErr } = await supabaseClient
      .from("incoming")
      .select("*")
      .in("id", ids);
    if (fetchErr) throw fetchErr;

    for (const item of items || []) {
      if (item.status === "applied") continue;

      await supabaseClient.rpc("increment_product_qty", {
        p_id: item.product_id,
        p_qty: Number(item.qty || 0),
      });

      // Tovar narxini yangilash
      if (item.buy_price) {
        try {
          const prodUpdates = { buy_price: Number(item.buy_price) };
          if (item.buy_price_usd) prodUpdates.buy_price_usd = Number(item.buy_price_usd);
          if (item.currency) prodUpdates.currency = item.currency;
          await supabaseClient.from("products").update(prodUpdates).eq("id", item.product_id);
        } catch (err) {
          console.error("Failed to update product buy price on incoming apply:", err);
        }
      }

      try {
        await supabaseClient.from("incoming").update({ status: "applied" }).eq("id", item.id);
      } catch {
        // column might not exist yet
      }
      appliedCount++;
    }

    await Promise.all([clearCached("cache:incoming"), clearCached("cache:products")]);
    return appliedCount;
  } else {
    const db = readLocalDb();

    for (const inc of db.incoming || []) {
      if (idSet.has(inc.id) && inc.status !== "applied") {
        inc.status = "applied";
        db.products = (db.products || []).map((p) => {
          if (p.id === inc.productId) {
            const updated = {
              ...p,
              quantity: (p.quantity || 0) + inc.qty,
              buyPrice: inc.buyPrice,
            };
            if (inc.buyPriceUsd !== undefined) updated.buyPriceUsd = inc.buyPriceUsd;
            if (inc.currency) updated.currency = inc.currency;
            return updated;
          }
          return p;
        });
        appliedCount++;
      }
    }

    writeLocalDb(db);
    return appliedCount;
  }
}
