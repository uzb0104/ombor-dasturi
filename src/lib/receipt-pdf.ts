import { jsPDF } from "jspdf";
import type { Sale } from "./types";
import type { Product, Customer, Employee } from "./types";
import { formatSom } from "./constants";

export type ReceiptLabels = {
  title: string;
  receipt: string;
  date: string;
  seller: string;
  customer: string;
  payment: string;
  item: string;
  qty: string;
  price: string;
  sum: string;
  subtotal: string;
  discount: string;
  total: string;
  thanks: string;
  warranty: string;
  generalCustomer: string;
};

const defaultLabels: ReceiptLabels = {
  title: "AutoERP Pro",
  receipt: "Sotuv cheki",
  date: "Sana",
  seller: "Sotuvchi",
  customer: "Mijoz",
  payment: "To'lov",
  item: "Tovar",
  qty: "Soni",
  price: "Narx",
  sum: "Summa",
  subtotal: "Oraliq jami",
  discount: "Chegirma",
  total: "JAMI",
  thanks: "Xaridingiz uchun rahmat!",
  warranty: "Kafolat — chek taqdim etilganda 3 kun.",
  generalCustomer: "Umumiy mijoz",
};

export function downloadSaleReceiptPdf(
  sale: Sale,
  ctx: {
    products: Product[];
    customers: Customer[];
    employees: Employee[];
    labels?: Partial<ReceiptLabels>;
  },
) {
  const L = { ...defaultLabels, ...ctx.labels };
  const doc = new jsPDF({ unit: "mm", format: [80, 297] });
  const margin = 5;
  let y = 8;
  const w = 70;

  const line = (
    text: string,
    opts?: { bold?: boolean; size?: number; align?: "center" | "left" },
  ) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 9);
    const align = opts?.align ?? "left";
    if (align === "center") {
      doc.text(text, margin + w / 2, y, { align: "center" });
    } else {
      doc.text(text, margin, y, { maxWidth: w });
    }
    y += opts?.size ? opts.size * 0.45 : 4.5;
  };

  const dash = () => {
    doc.setLineWidth(0.2);
    doc.line(margin, y, margin + w, y);
    y += 3;
  };

  line(L.title, { bold: true, size: 11, align: "center" });
  line(L.receipt, { align: "center", size: 8 });
  y += 1;
  dash();

  const customer = sale.customerId ? ctx.customers.find((c) => c.id === sale.customerId) : null;
  const seller = sale.sellerId ? ctx.employees.find((e) => e.id === sale.sellerId) : null;

  line(`${L.receipt} #${sale.id}`, { size: 8 });
  line(`${L.date}: ${new Date(sale.date).toLocaleString("uz-UZ")}`, { size: 8 });
  line(`${L.seller}: ${seller?.name || "—"}`, { size: 8 });
  line(`${L.customer}: ${customer?.name || L.generalCustomer}`, { size: 8 });
  line(`${L.payment}: ${sale.paymentType}`, { size: 8 });
  dash();

  line(`${L.item} | ${L.qty} | ${L.sum}`, { bold: true, size: 8 });

  let subtotal = 0;
  for (const item of sale.items) {
    const p = ctx.products.find((x) => x.id === item.productId);
    const sum = item.qty * item.price;
    subtotal += sum;
    const name = (p?.name || "—").slice(0, 22);
    line(`${name}`, { size: 8 });
    line(`  ${item.qty} x ${formatSom(item.price)} = ${formatSom(sum)}`, { size: 7 });
  }

  dash();
  line(`${L.subtotal}: ${formatSom(subtotal)}`, { size: 8 });
  if (sale.discount > 0) {
    line(`${L.discount}: -${formatSom(sale.discount)}`, { size: 8 });
  }
  line(`${L.total}: ${formatSom(sale.total)}`, { bold: true, size: 10 });
  dash();
  line(L.thanks, { align: "center", size: 7 });
  line(L.warranty, { align: "center", size: 6 });

  doc.save(`chek-${sale.id}.pdf`);
}
