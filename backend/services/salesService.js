import { isSupabaseConfigured, supabaseClient } from "../lib/db.js";

export async function createSaleDirectFallback(sale, items, dbSaleMeta) {
  if (!isSupabaseConfigured) return;

  // 1. To'g'ridan-to'g'ri sales jadvaliga yozish
  const { error: saleInsertError } = await supabaseClient.from("sales").insert(dbSaleMeta);
  if (saleInsertError) throw saleInsertError;

  // 2. To'g'ridan-to'g'ri sale_items jadvaliga yozish
  if (items && items.length > 0) {
    const dbItems = items.map((item) => ({
      sale_id: sale.id,
      product_id: item.productId,
      product_name: item.productName || null,
      qty: item.qty,
      price: item.price,
      buy_price: item.buyPrice || 0,
    }));
    const { error: itemsInsertError } = await supabaseClient.from("sale_items").insert(dbItems);
    if (itemsInsertError) console.warn("Failed to insert sale_items:", itemsInsertError.message);

    // 3. Ombor qoldiqlarini yangilash
    for (const item of items) {
      const { data: prod } = await supabaseClient
        .from("products")
        .select("quantity")
        .eq("id", item.productId)
        .single();
      if (prod) {
        await supabaseClient
          .from("products")
          .update({ quantity: Math.max(0, (prod.quantity || 0) - item.qty) })
          .eq("id", item.productId);
      }
    }
  }

  // 4. Qarz va xarid hisobini yangilash
  if (sale.customerId) {
    const { data: c } = await supabaseClient
      .from("customers")
      .select("debt, total_purchases")
      .eq("id", sale.customerId)
      .single();
    if (c) {
      const debtDelta =
        sale.paymentType === "Qarz" ? Math.max(0, sale.total - (sale.paid || 0)) : 0;
      await supabaseClient
        .from("customers")
        .update({
          debt: (c.debt || 0) + debtDelta,
          total_purchases: (c.total_purchases || 0) + sale.total,
        })
        .eq("id", sale.customerId);
    }
  }
}

export async function revertSaleInventoryAndDebt(oldSale, oldItems) {
  if (!isSupabaseConfigured) return;

  // 1. Tovar zaxiralarini qayta tiklash
  if (oldItems && oldItems.length > 0) {
    for (const oi of oldItems) {
      await supabaseClient.rpc("increment_product_qty", {
        p_id: oi.product_id,
        p_qty: oi.qty,
      });
    }
  }

  // 2. Mijoz hisob-kitoblarini qayta tiklash
  if (oldSale.customer_id) {
    const oldDebtDelta =
      oldSale.payment_type === "Qarz" ? Math.max(0, oldSale.total - (oldSale.paid || 0)) : 0;
    await supabaseClient.rpc("decrement_customer_debt", {
      c_id: oldSale.customer_id,
      delta_debt: oldDebtDelta,
      delta_purchases: oldSale.total,
    });
  }
}
