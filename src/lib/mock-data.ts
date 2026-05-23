import { VEHICLE_BRANDS, CATEGORIES, type VehicleBrand, type Category } from "./constants";

export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  vehicle: VehicleBrand;
  category: Category;
  supplierId: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  minQty: number;
  image?: string;
  description?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  vehicle: VehicleBrand;
  totalPurchases: number;
  debt: number;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  address: string;
  debt: number;
};

export type Employee = {
  id: string;
  name: string;
  phone: string;
  role: "Admin" | "Sotuvchi" | "Omborchi";
  salary: number;
  advance: number;
  hireDate: string;
  status: "Faol" | "Nofaol";
};

export type Sale = {
  id: string;
  date: string;
  customerId: string | null;
  sellerId: string;
  items: { productId: string; qty: number; price: number; buyPrice: number }[];
  discount: number;
  paymentType: "Naqd" | "Karta" | "Qarz";
  total: number;
  profit: number;
};

export type Expense = {
  id: string;
  date: string;
  category: string;
  amount: number;
  note: string;
};

export type IncomingStock = {
  id: string;
  date: string;
  supplierId: string;
  productId: string;
  qty: number;
  buyPrice: number;
  invoice: string;
};

const NAMES_UZ = [
  "Akmal Karimov", "Sardor Tursunov", "Jasur Saidov", "Otabek Nazarov", "Bobur Yusupov",
  "Dilshod Ergashev", "Sherzod Rahimov", "Aziz Tojiev", "Murod Qodirov", "Komil Xolmatov",
  "Ulug'bek Mansurov", "Davron Salimov", "Farrux Yo'ldoshev", "Rustam Ibragimov", "Sanjar Pulatov",
];

const PARTS = [
  "Tormoz kolodkasi", "Moy filtri", "Havo filtri", "Yoqilg'i filtri", "Akkumulyator 60Ah",
  "Akkumulyator 75Ah", "Far chirog'i", "Old tormoz diski", "Orqa tormoz diski", "Amortizator",
  "Sharikli podshipnik", "Generator", "Starter", "Radiator", "Termostat",
  "Suv nasosi", "Yoqilg'i nasosi", "Sham (svecha)", "Bobina", "ABS sensori",
  "Old fara", "Orqa fara", "Yon oyna", "Old bamper", "Orqa bamper",
  "Eshik tutqichi", "Ko'zgu", "Shina 175/70 R13", "Shina 185/65 R15", "Shina 195/65 R15",
  "Yoqilg'i nay", "Klapan qopqog'i", "Tirsak val", "Tarqatish kamari", "Rolik",
  "Vodyanoy", "Karbyurator", "Forsunka", "Yog' poddoni", "G'ildirak gaykasi",
  "Tormoz suyuqligi", "Antifriz 5L", "Motor moyi 4L", "Transmissiya moyi", "G'ildirak diski",
  "Salon filtri", "Glushitel", "Katalizator", "Klaksiv", "Stop signal",
  "Old qanot", "Kapot", "Bagaj qopqog'i",
];

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T { return arr[rnd(0, arr.length - 1)]!; }
function id(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2, 9)}`; }

export function generateMockData() {
  const suppliers: Supplier[] = Array.from({ length: 12 }, (_, i) => ({
    id: id("sup"),
    name: ["Auto Parts MChJ", "Avto Markaz", "Sharq Avto", "Avto Center", "OL Trade",
      "AutoExpress", "Avto Olam", "Master Avto", "Avto Plus", "Global Auto",
      "Avto Lider", "Yangi Avto"][i] || `Yetkazib ${i+1}`,
    phone: `+998 90 ${rnd(100,999)} ${rnd(10,99)} ${rnd(10,99)}`,
    address: `Toshkent, ${rnd(1, 12)}-ko'cha, ${rnd(1, 99)}-uy`,
    debt: rnd(0, 1) ? rnd(500_000, 25_000_000) : 0,
  }));

  const customers: Customer[] = Array.from({ length: 18 }, () => ({
    id: id("cust"),
    name: pick(NAMES_UZ),
    phone: `+998 ${pick(["90","91","93","94","97","99"])} ${rnd(100,999)} ${rnd(10,99)} ${rnd(10,99)}`,
    address: `Toshkent, ${rnd(1, 12)}-mavze`,
    vehicle: pick(VEHICLE_BRANDS),
    totalPurchases: rnd(1_000_000, 80_000_000),
    debt: rnd(0, 1) ? rnd(100_000, 8_000_000) : 0,
  }));

  const employees: Employee[] = [
    { id: id("emp"), name: "Akmal Karimov", phone: "+998 90 111 22 33", role: "Admin", salary: 8_000_000, advance: 2_000_000, hireDate: "2022-01-15", status: "Faol" },
    { id: id("emp"), name: "Sardor Tursunov", phone: "+998 91 222 33 44", role: "Sotuvchi", salary: 4_500_000, advance: 1_000_000, hireDate: "2023-03-10", status: "Faol" },
    { id: id("emp"), name: "Jasur Saidov", phone: "+998 93 333 44 55", role: "Sotuvchi", salary: 4_500_000, advance: 0, hireDate: "2023-06-22", status: "Faol" },
    { id: id("emp"), name: "Otabek Nazarov", phone: "+998 94 444 55 66", role: "Omborchi", salary: 5_000_000, advance: 1_500_000, hireDate: "2022-11-01", status: "Faol" },
    { id: id("emp"), name: "Bobur Yusupov", phone: "+998 97 555 66 77", role: "Omborchi", salary: 5_000_000, advance: 0, hireDate: "2024-01-15", status: "Faol" },
    { id: id("emp"), name: "Dilshod Ergashev", phone: "+998 99 666 77 88", role: "Sotuvchi", salary: 4_500_000, advance: 500_000, hireDate: "2024-04-20", status: "Faol" },
    { id: id("emp"), name: "Sherzod Rahimov", phone: "+998 90 777 88 99", role: "Sotuvchi", salary: 4_200_000, advance: 0, hireDate: "2024-08-05", status: "Faol" },
    { id: id("emp"), name: "Aziz Tojiev", phone: "+998 91 888 99 00", role: "Omborchi", salary: 4_800_000, advance: 800_000, hireDate: "2023-09-12", status: "Faol" },
    { id: id("emp"), name: "Murod Qodirov", phone: "+998 93 999 00 11", role: "Sotuvchi", salary: 4_500_000, advance: 0, hireDate: "2024-11-30", status: "Faol" },
    { id: id("emp"), name: "Komil Xolmatov", phone: "+998 94 000 11 22", role: "Sotuvchi", salary: 4_300_000, advance: 1_200_000, hireDate: "2025-02-18", status: "Nofaol" },
  ];

  const products: Product[] = Array.from({ length: 56 }, (_, i) => {
    const buy = rnd(20, 4000) * 1000;
    const sell = Math.round(buy * (1.15 + Math.random() * 0.35));
    const qty = rnd(0, 1) === 0 ? rnd(0, 8) : rnd(10, 200);
    return {
      id: id("prd"),
      name: PARTS[i % PARTS.length]!,
      sku: `SKU-${1000 + i}`,
      barcode: `486${String(rnd(100000000, 999999999))}`,
      vehicle: pick(VEHICLE_BRANDS),
      category: pick(CATEGORIES),
      supplierId: pick(suppliers).id,
      buyPrice: buy,
      sellPrice: sell,
      quantity: qty,
      minQty: 5,
    };
  });

  const now = Date.now();
  const sales: Sale[] = Array.from({ length: 38 }, () => {
    const item = pick(products);
    const qty = rnd(1, 5);
    const price = item.sellPrice;
    const total = price * qty;
    const profit = (price - item.buyPrice) * qty;
    return {
      id: id("sale"),
      date: new Date(now - rnd(0, 30) * 86400000 - rnd(0, 86400000)).toISOString(),
      customerId: pick(customers).id,
      sellerId: pick(employees.filter(e => e.role === "Sotuvchi")).id,
      items: [{ productId: item.id, qty, price, buyPrice: item.buyPrice }],
      discount: 0,
      paymentType: pick(["Naqd", "Karta", "Qarz"] as const),
      total,
      profit,
    };
  });

  const expenses: Expense[] = [
    ...["Ish haqi","Soliq","Transport","Elektr","Ombor ijarasi","Ta'mirlash","Internet","Boshqa"]
      .flatMap(cat => Array.from({length: 3}, () => ({
        id: id("exp"),
        date: new Date(now - rnd(0, 60) * 86400000).toISOString(),
        category: cat,
        amount: rnd(200_000, 8_000_000),
        note: `${cat} xarajati`,
      }))),
  ];

  const incoming: IncomingStock[] = Array.from({ length: 20 }, () => {
    const p = pick(products);
    return {
      id: id("inc"),
      date: new Date(now - rnd(0, 90) * 86400000).toISOString(),
      supplierId: p.supplierId,
      productId: p.id,
      qty: rnd(10, 100),
      buyPrice: p.buyPrice,
      invoice: `INV-${rnd(10000, 99999)}`,
    };
  });

  return { products, customers, suppliers, employees, sales, expenses, incoming };
}
