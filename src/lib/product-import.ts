import * as XLSX from "xlsx";
import type { Product } from "./mock-data";

export type ImportRow = Partial<Product> & { name: string };

const HEADER_MAP: Record<string, keyof ImportRow | "buyPrice" | "sellPrice"> = {
  nom: "name",
  name: "name",
  nomi: "name",
  tovar: "name",
  kod: "barcode",
  barcode: "barcode",
  sku: "sku",
  brend: "vehicle",
  vehicle: "vehicle",
  avtomobil: "vehicle",
  kategoriya: "category",
  category: "category",
  miqdor: "quantity",
  quantity: "quantity",
  qty: "quantity",
  min: "minQty",
  minqty: "minQty",
  sotib: "buyPrice",
  buy: "buyPrice",
  buyprice: "buyPrice",
  sotuv: "sellPrice",
  sell: "sellPrice",
  sellprice: "sellPrice",
  narx: "sellPrice",
};

function normHeader(h: string): string {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/['']/g, "'");
}

function rowToProduct(row: Record<string, unknown>, categories: string[], brands: string[]): ImportRow | null {
  const mapped: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    const field = HEADER_MAP[normHeader(key)];
    if (field) mapped[field] = val;
  }
  const name = String(mapped.name || "").trim();
  if (!name) return null;

  const category = String(mapped.category || categories[0] || "").trim();
  const vehicle = String(mapped.vehicle || brands[0] || "").trim();
  const cat = categories.includes(category) ? category : categories[0] || category;
  const veh = brands.includes(vehicle) ? vehicle : brands[0] || vehicle;

  return {
    id: `prd_${Math.random().toString(36).slice(2, 9)}`,
    name,
    sku: String(mapped.sku || ""),
    barcode: String(mapped.barcode || "").toUpperCase(),
    vehicle: veh as Product["vehicle"],
    category: cat as Product["category"],
    supplierId: "",
    buyPrice: Number(mapped.buyPrice) || 0,
    sellPrice: Number(mapped.sellPrice) || 0,
    quantity: Number(mapped.quantity) || 0,
    minQty: Number(mapped.minQty) || 5,
  };
}

export function parseProductSpreadsheet(
  buffer: ArrayBuffer,
  categories: string[],
  brands: string[]
): ImportRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map((r) => rowToProduct(r, categories, brands)).filter((x): x is ImportRow => !!x);
}

export function parseProductCsv(
  text: string,
  categories: string[],
  brands: string[]
): ImportRow[] {
  const wb = XLSX.read(text, { type: "string" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map((r) => rowToProduct(r, categories, brands)).filter((x): x is ImportRow => !!x);
}

export function downloadImportTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["nom", "kod", "brend", "kategoriya", "miqdor", "sotib", "sotuv", "min"],
    ["Tormoz kolodkasi", "B7RTC", "Chevrolet", "Tormoz tizimi", 10, 50000, 75000, 5],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tovarlar");
  XLSX.writeFile(wb, "tovarlar_import_shablon.xlsx");
}
