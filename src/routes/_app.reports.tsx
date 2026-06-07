import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  TrendingUp,
  Wallet,
  Receipt,
  Printer,
  ShoppingCart,
  Percent,
  Package,
  CalendarDays,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { useMemo, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { paymentLabel } from "@/lib/i18n/helpers";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { priceHistoryApi } from "@/lib/api";
import type { PriceHistoryEntry, Sale, Expense } from "@/lib/types";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

type Period = "today" | "week" | "month" | "all";

function ReportsPage() {
  const t = useT();
  const { sales, expenses, products, customers, employees } = useStore();
  const [printOpen, setPrintOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("today");
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [viewMode, setViewMode] = useState<"periodic" | "consolidated">("periodic");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    priceHistoryApi
      .getAll()
      .then((data) => setPriceHistory(data))
      .catch(() => { });
  }, []);

  // ─── Davr bo'yicha filterlash ───
  const periodBounds = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 30);
    return { todayStart, weekStart, monthStart };
  }, []);

  const filteredSales = useMemo(() => {
    const { todayStart, weekStart, monthStart } = periodBounds;
    return sales.filter((s) => {
      const d = new Date(s.date);
      if (period === "today") return d >= todayStart;
      if (period === "week") return d >= weekStart;
      if (period === "month") return d >= monthStart;
      return true;
    });
  }, [sales, period, periodBounds]);

  const filteredExpenses = useMemo(() => {
    const { todayStart, weekStart, monthStart } = periodBounds;
    return expenses.filter((e) => {
      const d = new Date(e.date);
      if (period === "today") return d >= todayStart;
      if (period === "week") return d >= weekStart;
      if (period === "month") return d >= monthStart;
      return true;
    });
  }, [expenses, period, periodBounds]);

  // ─── Umumiy statistika ───
  const totalSales = filteredSales.reduce((a, s) => a + s.total, 0);
  const totalProfit = filteredSales.reduce((a, s) => a + s.profit, 0);
  const totalDiscount = filteredSales.reduce((a, s) => a + (s.discount || 0), 0);
  const totalExpense = filteredExpenses.reduce((a, e) => a + e.amount, 0);
  const totalItemsSold = filteredSales.reduce(
    (a, s) => a + s.items.reduce((b, i) => b + i.qty, 0),
    0,
  );
  const txCount = filteredSales.length;

  // ─── Tovarlar bo'yicha hisobot ───
  const productBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        vehicle: string;
        totalQty: number;
        totalRevenue: number;
        totalProfit: number;
        totalBuyValue: number;
      }
    >();
    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        const existing = map.get(item.productId);
        const prod = products.find((p) => p.id === item.productId);
        const name = prod?.name || item.productName || "Noma'lum";
        const vehicle = prod?.vehicle || "";
        if (existing) {
          existing.totalQty += item.qty;
          existing.totalRevenue += item.price * item.qty;
          existing.totalProfit += (item.price - item.buyPrice) * item.qty;
          existing.totalBuyValue += item.buyPrice * item.qty;
        } else {
          map.set(item.productId, {
            productId: item.productId,
            name,
            vehicle,
            totalQty: item.qty,
            totalRevenue: item.price * item.qty,
            totalProfit: (item.price - item.buyPrice) * item.qty,
            totalBuyValue: item.buyPrice * item.qty,
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSales, products]);

  // ─── To'lov turi bo'yicha ───
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredSales.forEach((s) => {
      const key = s.paymentType;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.total += s.total;
      } else {
        map.set(key, { count: 1, total: s.total });
      }
    });
    return Array.from(map.entries()).map(([type, data]) => ({
      type,
      ...data,
    }));
  }, [filteredSales]);

  const isMonthGrouping = period === "all";

  const groupedData = useMemo(() => {
    const groupsMap = new Map<string, { sales: Sale[]; expenses: Expense[] }>();

    // 1. Group sales
    filteredSales.forEach((sale) => {
      const key = isMonthGrouping
        ? sale.date.slice(0, 7) // YYYY-MM
        : sale.date.slice(0, 10); // YYYY-MM-DD

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { sales: [], expenses: [] });
      }
      groupsMap.get(key)!.sales.push(sale);
    });

    // 2. Group expenses
    filteredExpenses.forEach((exp) => {
      const key = isMonthGrouping
        ? exp.date.slice(0, 7) // YYYY-MM
        : exp.date.slice(0, 10); // YYYY-MM-DD

      if (!groupsMap.has(key)) {
        groupsMap.set(key, { sales: [], expenses: [] });
      }
      groupsMap.get(key)!.expenses.push(exp);
    });

    // 3. Format & Sort groups (newest first)
    const sortedKeys = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((key) => {
      const { sales: groupSales, expenses: groupExpenses } = groupsMap.get(key)!;

      // Calculate totals for this group
      const gSales = groupSales.reduce((a, s) => a + s.total, 0);
      const gDiscount = groupSales.reduce((a, s) => a + (s.discount || 0), 0);
      const gProfit = groupSales.reduce((a, s) => a + s.profit, 0);
      const gExpense = groupExpenses.reduce((a, e) => a + e.amount, 0);
      const gItemsCount = groupSales.reduce(
        (a, s) => a + s.items.reduce((b, i) => b + i.qty, 0),
        0,
      );

      // Label
      let label = key;
      const date = new Date(isMonthGrouping ? `${key}-02` : key); // Avoid timezone shift
      if (!isNaN(date.getTime())) {
        if (isMonthGrouping) {
          label = date.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" });
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          const compareDate = new Date(date);
          compareDate.setHours(0, 0, 0, 0);

          if (compareDate.getTime() === today.getTime()) {
            label = `Bugun (${date.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" })})`;
          } else if (compareDate.getTime() === yesterday.getTime()) {
            label = `Kecha (${date.toLocaleDateString("uz-UZ", { day: "numeric", month: "long" })})`;
          } else {
            label = date.toLocaleDateString("uz-UZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
          }
        }
      }

      return {
        key,
        label,
        sales: groupSales,
        expenses: groupExpenses,
        totals: {
          sales: gSales,
          discount: gDiscount,
          profit: gProfit,
          expense: gExpense,
          itemsCount: gItemsCount,
          netProfit: gProfit - gExpense,
        },
      };
    });
  }, [filteredSales, filteredExpenses, isMonthGrouping]);

  const getGroupProductBreakdown = useCallback((groupSales: Sale[]): {
    productId: string;
    name: string;
    vehicle: string;
    totalQty: number;
    totalRevenue: number;
    totalProfit: number;
  }[] => {
    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        vehicle: string;
        totalQty: number;
        totalRevenue: number;
        totalProfit: number;
      }
    >();
    groupSales.forEach((s) => {
      s.items.forEach((item) => {
        const existing = map.get(item.productId);
        const prod = products.find((p) => p.id === item.productId);
        const name = prod?.name || item.productName || "Noma'lum";
        const vehicle = prod?.vehicle || "";
        if (existing) {
          existing.totalQty += item.qty;
          existing.totalRevenue += item.price * item.qty;
          existing.totalProfit += (item.price - item.buyPrice) * item.qty;
        } else {
          map.set(item.productId, {
            productId: item.productId,
            name,
            vehicle,
            totalQty: item.qty,
            totalRevenue: item.price * item.qty,
            totalProfit: (item.price - item.buyPrice) * item.qty,
          });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [products]);

  // ─── Kunlik grafik ma'lumotlar ───
  const chartData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const days = period === "today" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 14;
    const result: { date: string; sotuv: number; foyda: number; chegirma: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const daySales = filteredSales.filter((x) => {
        const dx = new Date(x.date);
        return dx >= d && dx < next;
      });
      result.push({
        date: d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" }),
        sotuv: daySales.reduce((a, s) => a + s.total, 0),
        foyda: daySales.reduce((a, s) => a + s.profit, 0),
        chegirma: daySales.reduce((a, s) => a + (s.discount || 0), 0),
      });
    }
    return result;
  }, [filteredSales, period]);

  // ─── Excel eksport ───
  const exportExcel = () => {
    const periodLabel =
      period === "today"
        ? "Bugungi"
        : period === "week"
          ? "Haftalik"
          : period === "month"
            ? "Oylik"
            : "Umumiy";

    const html = `
      <html xmlns:o="urn:schemas-microsoft-xml-soap:office:office" xmlns:x="urn:schemas-microsoft-xml-soap:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: sans-serif; font-size: 11pt; }
          th { background-color: #2563eb; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; }
          td { border: 1px solid #cbd5e1; padding: 8px; }
          h2 { color: #1e293b; margin-bottom: 2px; }
          .summary { background-color: #f0fdf4; font-weight: bold; }
          .discount { color: #dc2626; }
          .profit { color: #16a34a; }
        </style>
      </head>
      <body>
        <h2>AutoERP Pro — ${periodLabel} Hisobot</h2>
        <p>Sana: ${new Date().toLocaleString("uz-UZ")}</p>
        
        <h3>Moliyaviy Ko'rsatkichlar</h3>
        <table>
          <thead>
            <tr><th>Ko'rsatkich</th><th>Summa (so'm)</th></tr>
          </thead>
          <tbody>
            <tr><td>Jami sotuv</td><td>${totalSales}</td></tr>
            <tr><td>Jami chegirma</td><td class="discount">${totalDiscount}</td></tr>
            <tr><td>Jami foyda</td><td class="profit">${totalProfit}</td></tr>
            <tr><td>Jami xarajat</td><td>${totalExpense}</td></tr>
            <tr class="summary"><td>Sof foyda</td><td class="profit">${totalProfit - totalExpense}</td></tr>
            <tr><td>Sotilgan tovarlar soni</td><td>${totalItemsSold}</td></tr>
            <tr><td>Tranzaksiyalar soni</td><td>${txCount}</td></tr>
          </tbody>
        </table>

        <h3>Tovarlar bo'yicha hisobot</h3>
        <table>
          <thead>
            <tr>
              <th>Tovar nomi</th>
              <th>Brend</th>
              <th>Sotilgan soni</th>
              <th>Sotib olish qiymati</th>
              <th>Sotuv summasi</th>
              <th>Foyda</th>
            </tr>
          </thead>
          <tbody>
            ${productBreakdown
        .map(
          (p) => `
              <tr>
                <td>${p.name}</td>
                <td>${p.vehicle}</td>
                <td>${p.totalQty}</td>
                <td>${p.totalBuyValue}</td>
                <td>${p.totalRevenue}</td>
                <td class="profit">${p.totalProfit}</td>
              </tr>
            `,
        )
        .join("")}
          </tbody>
        </table>

        <h3>Sotuvlar tafsiloti</h3>
        <table>
          <thead>
            <tr>
              <th>Sana</th>
              <th>Mijoz</th>
              <th>Tovarlar</th>
              <th>Chegirma</th>
              <th>Jami summa</th>
              <th>Foyda</th>
              <th>To'lov</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales
        .map((s) => {
          const c = customers.find((x) => x.id === s.customerId);
          const itemNames = s.items
            .map((i) => {
              const p = products.find((x) => x.id === i.productId);
              return `${p?.name || "?"} x${i.qty}`;
            })
            .join(", ");
          return `
                <tr>
                  <td>${new Date(s.date).toLocaleDateString("uz-UZ")}</td>
                  <td>${c?.name || "Umumiy mijoz"}</td>
                  <td>${itemNames}</td>
                  <td class="discount">${s.discount || 0}</td>
                  <td>${s.total}</td>
                  <td class="profit">${s.profit}</td>
                  <td>${s.paymentType}</td>
                </tr>
              `;
        })
        .join("")}
          </tbody>
        </table>

        <h3>Xarajatlar</h3>
        <table>
          <thead>
            <tr><th>Sana</th><th>Kategoriya</th><th>Summa</th><th>Izoh</th></tr>
          </thead>
          <tbody>
            ${filteredExpenses
        .map(
          (e) => `
              <tr>
                <td>${new Date(e.date).toLocaleDateString("uz-UZ")}</td>
                <td>${e.category}</td>
                <td>${e.amount}</td>
                <td>${e.note || ""}</td>
              </tr>
            `,
        )
        .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `autoerp_${period}_hisobot_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    toast.success(t("reports.excelDownloaded"));
  };

  const periodTabs: { key: Period; label: string; icon: typeof Clock }[] = [
    { key: "today", label: "Bugungi", icon: Clock },
    { key: "week", label: "Haftalik", icon: Calendar },
    { key: "month", label: "Oylik", icon: CalendarDays },
    { key: "all", label: "Umumiy", icon: TrendingUp },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={() => setPrintOpen(true)}>
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" onClick={exportExcel}>
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
          </>
        }
      />

      {/* ─── DAVR TANLASH TABLARI ─── */}
      <div className="flex gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/60 w-fit">
        {periodTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${period === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── STATISTIK KARTALAR ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Jami sotuv"
          value={formatSom(totalSales)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label="Sof foyda"
          value={formatSom(totalProfit)}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label="Chegirmalar"
          value={formatSom(totalDiscount)}
          icon={Percent}
          accent="warning"
        />
        <StatCard
          label="Xarajatlar"
          value={formatSom(totalExpense)}
          icon={Receipt}
          accent="destructive"
        />
        <StatCard
          label="Sotilgan dona"
          value={`${totalItemsSold} ta`}
          icon={Package}
          accent="info"
        />
        <StatCard
          label="Tranzaksiyalar"
          value={`${txCount} ta`}
          icon={ShoppingCart}
          accent="primary"
        />
      </div>

      {/* ─── TO'LOV TURLARI BO'YICHA ─── */}
      {paymentBreakdown.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {paymentBreakdown.map(({ type, count, total }) => (
            <Card key={type} className="rounded-xl border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase">
                      {paymentLabel(t, type)}
                    </div>
                    <div className="text-lg font-bold mt-0.5">{formatSom(total)}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {count} ta
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── SOTUV VA FOYDA GRAFIK ─── */}
      {period !== "today" && chartData.length > 1 && (
        <Card className="rounded-2xl card-elevated border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sotuv, foyda va chegirma dinamikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  formatter={(v: number, name: string) => [
                    formatSom(v),
                    name === "sotuv" ? "Sotuv" : name === "foyda" ? "Foyda" : "Chegirma",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="sotuv"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="foyda"
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="chegirma"
                  stroke="var(--destructive)"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ─── TAHLIL REJIMLARINI TANLASH ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 pt-2 gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {viewMode === "periodic" ? "Davriy batafsil tahlil" : "Umumlashtirilgan hisobot jadvallari"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {viewMode === "periodic"
              ? "Har bir kun yoki oy kesimida sotilgan tovarlar va chegirmalar tafsiloti"
              : "Tanlangan davr uchun barcha tovarlar va tranzaksiyalarning umumiy ro'yxati"}
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-muted/60 rounded-xl border border-border w-fit self-start sm:self-auto">
          <button
            onClick={() => setViewMode("periodic")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "periodic"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Davriy tahlil ({isMonthGrouping ? "Oylar" : "Kunlar"} kesimida)
          </button>
          <button
            onClick={() => setViewMode("consolidated")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "consolidated"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Umumlashtirilgan jadvallar
          </button>
        </div>
      </div>

      {viewMode === "periodic" ? (
        <div className="space-y-3.5">
          {groupedData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed rounded-2xl bg-muted/10">
              Bu davr uchun ma'lumotlar topilmadi.
            </div>
          ) : (
            groupedData.map((group) => {
              const isExpanded = !!expandedGroups[group.key];
              const netProfitColor = group.totals.netProfit >= 0 ? "text-success" : "text-destructive";

              return (
                <Card
                  key={group.key}
                  className={`rounded-2xl border-border/60 overflow-hidden transition-all duration-200 ${isExpanded ? "ring-1 ring-primary/20 shadow-md bg-card" : "hover:bg-muted/10 bg-card/60"
                    }`}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleGroup(group.key)}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base md:text-lg text-foreground">
                          {group.label}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {group.sales.length} ta sotuv · {group.expenses.length} ta xarajat · {group.totals.itemsCount} dona tovar sotildi
                        </p>
                      </div>
                    </div>

                    {/* Stats Summary in Header */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs md:text-sm">
                      <div className="tabular-nums">
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">Sotuv</span>
                        <span className="font-semibold text-foreground">{formatSom(group.totals.sales)}</span>
                      </div>
                      {group.totals.discount > 0 && (
                        <div className="tabular-nums">
                          <span className="text-muted-foreground block text-[10px] uppercase font-medium">Chegirma</span>
                          <span className="font-semibold text-destructive">-{formatSom(group.totals.discount)}</span>
                        </div>
                      )}
                      {group.totals.expense > 0 && (
                        <div className="tabular-nums">
                          <span className="text-muted-foreground block text-[10px] uppercase font-medium">Xarajat</span>
                          <span className="font-semibold text-destructive">-{formatSom(group.totals.expense)}</span>
                        </div>
                      )}
                      <div className="tabular-nums border-l pl-4 border-border/60">
                        <span className="text-muted-foreground block text-[10px] uppercase font-medium">Sof Foyda</span>
                        <span className={`font-bold ${netProfitColor}`}>
                          {group.totals.netProfit >= 0 ? "+" : ""}{formatSom(group.totals.netProfit)}
                        </span>
                      </div>
                      <div className="text-muted-foreground pl-1.5">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-primary rotate-180 transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="h-5 w-5 transition-transform duration-200" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="border-t bg-muted/10 px-4 md:px-6 py-5 space-y-6 animate-fade-in">
                      {/* Products Sold Table */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-primary" />
                          Sotilgan tovarlar tafsiloti
                        </h4>
                        {group.sales.length === 0 ? (
                          <div className="text-xs text-muted-foreground py-2 italic pl-5">
                            Bu davrda tovarlar sotilmagan.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border bg-card border-border/60">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-muted/40 border-b font-semibold text-muted-foreground uppercase tracking-wider">
                                  <th className="p-2.5">Tovar nomi</th>
                                  <th className="p-2.5">Brend</th>
                                  <th className="p-2.5 text-center">Soni</th>
                                  <th className="p-2.5 text-right">Sotuv summasi</th>
                                  <th className="p-2.5 text-right">Foyda</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getGroupProductBreakdown(group.sales).map((p) => (
                                  <tr key={p.productId} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="p-2.5 font-medium">{p.name}</td>
                                    <td className="p-2.5 text-muted-foreground text-[11px]">{p.vehicle}</td>
                                    <td className="p-2.5 text-center font-semibold tabular-nums">{p.totalQty} ta</td>
                                    <td className="p-2.5 text-right font-semibold tabular-nums">{formatSom(p.totalRevenue)}</td>
                                    <td className="p-2.5 text-right font-bold tabular-nums text-success">+{formatSom(p.totalProfit)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Transactions Table */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                          Tranzaksiyalar ro'yxati
                        </h4>
                        {group.sales.length === 0 ? (
                          <div className="text-xs text-muted-foreground py-2 italic pl-5">
                            Bu davrda sotuvlar amalga oshirilmagan.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border bg-card border-border/60">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-muted/40 border-b font-semibold text-muted-foreground uppercase tracking-wider">
                                  <th className="p-2.5">Sana/Vaqt</th>
                                  <th className="p-2.5">Mijoz</th>
                                  <th className="p-2.5 text-center">Tovarlar</th>
                                  <th className="p-2.5 text-right">Chegirma</th>
                                  <th className="p-2.5 text-right">Jami summa</th>
                                  <th className="p-2.5 text-right">Foyda</th>
                                  <th className="p-2.5">To'lov</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.sales
                                  .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                                  .map((s) => {
                                    const c = customers.find((x) => x.id === s.customerId);
                                    const itemCount = s.items.reduce((a, i) => a + i.qty, 0);
                                    return (
                                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                                        <td className="p-2.5 tabular-nums text-[11px] text-muted-foreground">
                                          {new Date(s.date).toLocaleTimeString("uz-UZ", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </td>
                                        <td className="p-2.5 font-medium">{c?.name || "Umumiy mijoz"}</td>
                                        <td className="p-2.5 text-center">
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                            {itemCount} ta ({s.items.length} xil)
                                          </Badge>
                                        </td>
                                        <td className="p-2.5 text-right font-medium text-destructive tabular-nums">
                                          {s.discount > 0 ? `-${formatSom(s.discount)}` : "—"}
                                        </td>
                                        <td className="p-2.5 text-right font-semibold tabular-nums">{formatSom(s.total)}</td>
                                        <td className="p-2.5 text-right font-bold tabular-nums text-success">+{formatSom(s.profit)}</td>
                                        <td className="p-2.5">
                                          <Badge
                                            variant={
                                              s.paymentType === "Qarz"
                                                ? "destructive"
                                                : s.paymentType === "Karta"
                                                  ? "default"
                                                  : "secondary"
                                            }
                                            className="text-[9px] px-1.5 py-0"
                                          >
                                            {paymentLabel(t, s.paymentType)}
                                          </Badge>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Expenses Table */}
                      {group.expenses.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Receipt className="h-3.5 w-3.5 text-destructive" />
                            Xarajatlar
                          </h4>
                          <div className="overflow-x-auto rounded-xl border bg-card border-border/60">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-muted/40 border-b font-semibold text-muted-foreground uppercase tracking-wider">
                                  <th className="p-2.5">Vaqt</th>
                                  <th className="p-2.5">Kategoriya</th>
                                  <th className="p-2.5 text-right">Summa</th>
                                  <th className="p-2.5">Izoh</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.expenses.map((e) => (
                                  <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="p-2.5 tabular-nums text-[11px] text-muted-foreground">
                                      {new Date(e.date).toLocaleTimeString("uz-UZ", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </td>
                                    <td className="p-2.5 font-medium">{e.category}</td>
                                    <td className="p-2.5 text-right font-semibold text-destructive tabular-nums">
                                      -{formatSom(e.amount)}
                                    </td>
                                    <td className="p-2.5 text-muted-foreground text-[11px] max-w-[200px] truncate">
                                      {e.note || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <>
          {/* ─── TOVARLAR BO'YICHA TAFSILIY HISOBOT ─── */}
          <Card className="rounded-2xl card-elevated border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Sotilgan tovarlar tafsiloti
                <Badge variant="secondary" className="ml-auto text-xs">
                  {productBreakdown.length} xil tovar
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productBreakdown.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Bu davr uchun sotuvlar topilmadi.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="p-3">Tovar nomi</th>
                        <th className="p-3">Brend</th>
                        <th className="p-3 text-center">Sotilgan</th>
                        <th className="p-3 text-right">Tan narxi</th>
                        <th className="p-3 text-right">Sotuv summasi</th>
                        <th className="p-3 text-right">Foyda</th>
                        <th className="p-3 text-right">Marja %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productBreakdown.map((p, idx) => {
                        const margin =
                          p.totalRevenue > 0
                            ? ((p.totalProfit / p.totalRevenue) * 100).toFixed(1)
                            : "0.0";
                        return (
                          <tr
                            key={p.productId}
                            className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${idx < 3 ? "bg-success/5" : ""}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {idx < 3 && (
                                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                    {idx + 1}
                                  </span>
                                )}
                                <span className="font-medium">{p.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground text-xs">{p.vehicle}</td>
                            <td className="p-3 text-center font-semibold tabular-nums">
                              {p.totalQty} ta
                            </td>
                            <td className="p-3 text-right tabular-nums text-muted-foreground text-xs">
                              {formatSom(p.totalBuyValue)}
                            </td>
                            <td className="p-3 text-right font-semibold tabular-nums">
                              {formatSom(p.totalRevenue)}
                            </td>
                            <td className="p-3 text-right font-bold tabular-nums text-success">
                              +{formatSom(p.totalProfit)}
                            </td>
                            <td className="p-3 text-right">
                              <Badge
                                variant={Number(margin) >= 20 ? "default" : "secondary"}
                                className="text-[10px] tabular-nums"
                              >
                                {margin}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 border-t-2 font-bold text-sm">
                        <td className="p-3" colSpan={2}>
                          JAMI
                        </td>
                        <td className="p-3 text-center tabular-nums">{totalItemsSold} ta</td>
                        <td className="p-3 text-right tabular-nums text-muted-foreground">
                          {formatSom(productBreakdown.reduce((a, p) => a + p.totalBuyValue, 0))}
                        </td>
                        <td className="p-3 text-right tabular-nums">{formatSom(totalSales)}</td>
                        <td className="p-3 text-right tabular-nums text-success">
                          +{formatSom(productBreakdown.reduce((a, p) => a + p.totalProfit, 0))}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── SOTUVLAR TAFSILOTI (HAR BIR TRANZAKSIYA) ─── */}
          <Card className="rounded-2xl card-elevated border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Sotuvlar ro'yxati
                <Badge variant="secondary" className="ml-auto text-xs">
                  {txCount} ta tranzaksiya
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSales.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Bu davr uchun sotuvlar topilmadi.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="p-3 w-8"></th>
                        <th className="p-3">Sana</th>
                        <th className="p-3">Mijoz</th>
                        <th className="p-3 text-center">Tovarlar</th>
                        <th className="p-3 text-right">Chegirma</th>
                        <th className="p-3 text-right">Jami summa</th>
                        <th className="p-3 text-right">Foyda</th>
                        <th className="p-3">To'lov</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales
                        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                        .map((s) => {
                          const c = customers.find((x) => x.id === s.customerId);
                          const isExpanded = expandedSaleId === s.id;
                          const itemCount = s.items.reduce((a, i) => a + i.qty, 0);
                          return (
                            <>
                              <tr
                                key={s.id}
                                className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                                onClick={() => setExpandedSaleId(isExpanded ? null : s.id)}
                              >
                                <td className="p-3 text-center">
                                  {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </td>
                                <td className="p-3 tabular-nums text-xs">
                                  {new Date(s.date).toLocaleDateString("uz-UZ", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                  <span className="block text-[10px] text-muted-foreground">
                                    {new Date(s.date).toLocaleTimeString("uz-UZ", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </td>
                                <td className="p-3 font-medium">
                                  {c?.name || "Umumiy mijoz"}
                                </td>
                                <td className="p-3 text-center">
                                  <Badge variant="outline" className="text-[10px]">
                                    {itemCount} dona ({s.items.length} xil)
                                  </Badge>
                                </td>
                                <td className="p-3 text-right tabular-nums">
                                  {s.discount > 0 ? (
                                    <span className="text-destructive font-medium">
                                      −{formatSom(s.discount)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-semibold tabular-nums">
                                  {formatSom(s.total)}
                                </td>
                                <td className="p-3 text-right font-bold tabular-nums text-success">
                                  +{formatSom(s.profit)}
                                </td>
                                <td className="p-3">
                                  <Badge
                                    variant={
                                      s.paymentType === "Qarz"
                                        ? "destructive"
                                        : s.paymentType === "Karta"
                                          ? "default"
                                          : "secondary"
                                    }
                                    className="text-[10px]"
                                  >
                                    {paymentLabel(t, s.paymentType)}
                                  </Badge>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr key={`${s.id}-detail`}>
                                  <td colSpan={8} className="p-0">
                                    <div className="bg-muted/20 border-y px-6 py-3">
                                      <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                        Sotilgan tovarlar:
                                      </div>
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-muted-foreground font-medium">
                                            <th className="pb-1.5 text-left">Tovar</th>
                                            <th className="pb-1.5 text-center">Soni</th>
                                            <th className="pb-1.5 text-right">Narxi</th>
                                            <th className="pb-1.5 text-right">Jami</th>
                                            <th className="pb-1.5 text-right">Foyda</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {s.items.map((item, idx) => {
                                            const prod = products.find(
                                              (p) => p.id === item.productId,
                                            );
                                            return (
                                              <tr
                                                key={idx}
                                                className="border-t border-border/30"
                                              >
                                                <td className="py-1.5 font-medium">
                                                  {prod?.name || item.productName || "Noma'lum"}
                                                  {prod?.vehicle && (
                                                    <span className="text-muted-foreground ml-1">
                                                      ({prod.vehicle})
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="py-1.5 text-center tabular-nums">
                                                  {item.qty} ta
                                                </td>
                                                <td className="py-1.5 text-right tabular-nums">
                                                  {formatSom(item.price)}
                                                </td>
                                                <td className="py-1.5 text-right font-semibold tabular-nums">
                                                  {formatSom(item.price * item.qty)}
                                                </td>
                                                <td className="py-1.5 text-right tabular-nums text-success">
                                                  +
                                                  {formatSom(
                                                    (item.price - item.buyPrice) * item.qty,
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                      {s.discount > 0 && (
                                        <div className="mt-2 pt-2 border-t border-border/30 flex justify-between text-xs">
                                          <span className="text-destructive font-medium">
                                            Chegirma:
                                          </span>
                                          <span className="text-destructive font-bold tabular-nums">
                                            −{formatSom(s.discount)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 border-t-2 font-bold text-sm">
                        <td className="p-3" colSpan={4}>
                          JAMI
                        </td>
                        <td className="p-3 text-right tabular-nums text-destructive">
                          −{formatSom(totalDiscount)}
                        </td>
                        <td className="p-3 text-right tabular-nums">{formatSom(totalSales)}</td>
                        <td className="p-3 text-right tabular-nums text-success">
                          +{formatSom(totalProfit)}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── XARAJATLAR ─── */}
          {filteredExpenses.length > 0 && (
            <Card className="rounded-2xl card-elevated border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-destructive" />
                  Xarajatlar
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {filteredExpenses.length} ta
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                        <th className="p-3">Sana</th>
                        <th className="p-3">Kategoriya</th>
                        <th className="p-3 text-right">Summa</th>
                        <th className="p-3">Izoh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses
                        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                        .map((e) => (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3 tabular-nums text-xs">
                              {new Date(e.date).toLocaleDateString("uz-UZ")}
                            </td>
                            <td className="p-3 font-medium">{e.category}</td>
                            <td className="p-3 text-right font-semibold tabular-nums text-destructive">
                              −{formatSom(e.amount)}
                            </td>
                            <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">
                              {e.note || "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50 border-t-2 font-bold text-sm">
                        <td className="p-3" colSpan={2}>
                          JAMI XARAJAT
                        </td>
                        <td className="p-3 text-right tabular-nums text-destructive">
                          −{formatSom(totalExpense)}
                        </td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ─── NARX O'ZGARISHLAR TARIXI ─── */}
      <Card className="rounded-2xl card-elevated border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Narx o'zgarishlar tarixi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border/60 text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/40 border-b font-bold text-muted-foreground">
                  <th className="p-3">Sana</th>
                  <th className="p-3">Tovar nomi</th>
                  <th className="p-3">Tur</th>
                  <th className="p-3 text-right">Eski narx</th>
                  <th className="p-3 text-right">Yangi narx</th>
                  <th className="p-3">Kim tomonidan</th>
                </tr>
              </thead>
              <tbody>
                {priceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-muted-foreground">
                      Narx o'zgarishlari topilmadi.
                    </td>
                  </tr>
                ) : (
                  priceHistory.slice(0, 10).map((h) => (
                    <tr key={h.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 tabular-nums text-muted-foreground">
                        {new Date(h.createdAt).toLocaleDateString("uz-UZ", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 font-semibold text-foreground">{h.productName}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">
                          {h.field === "buy_price" ? "Kirim narx" : "Sotish narx"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                        {formatSom(h.oldValue || 0)}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-foreground">
                        {formatSom(h.newValue)}
                      </td>
                      <td className="p-3 text-muted-foreground">{h.changedByName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── PDF PRINT DIALOG ─── */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-4xl p-6 bg-card border rounded-2xl shadow-elevated overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> {t("reports.printDialog")}
            </DialogTitle>
          </DialogHeader>

          <div
            id="print-area"
            className="p-6 bg-white text-black font-sans text-sm space-y-6 rounded-xl border shadow-sm"
          >
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">AutoERP Pro</h1>
                <p className="text-xs text-gray-500 mt-1">{t("reports.systemDesc")}</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold text-gray-700">
                  {period === "today"
                    ? "KUNLIK"
                    : period === "week"
                      ? "HAFTALIK"
                      : period === "month"
                        ? "OYLIK"
                        : "UMUMIY"}{" "}
                  HISOBOT
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Sana: {new Date().toLocaleDateString("uz-UZ")}
                </p>
              </div>
            </div>

            {/* Moliyaviy ko'rsatkichlar */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Moliyaviy Ko'rsatkichlar
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="border p-3 rounded-lg bg-gray-50">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">
                    Jami sotuv
                  </span>
                  <span className="text-base font-bold tabular-nums text-gray-900">
                    {formatSom(totalSales)}
                  </span>
                </div>
                <div className="border p-3 rounded-lg bg-gray-50">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">
                    Jami chegirma
                  </span>
                  <span className="text-base font-bold tabular-nums text-red-600">
                    −{formatSom(totalDiscount)}
                  </span>
                </div>
                <div className="border p-3 rounded-lg bg-gray-50">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">
                    Sof foyda
                  </span>
                  <span className="text-base font-bold tabular-nums text-green-700">
                    +{formatSom(totalProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tovarlar jadvali */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Sotilgan tovarlar tafsiloti
              </h3>
              <table className="w-full text-left text-xs border">
                <thead>
                  <tr className="bg-gray-100 border-b font-bold">
                    <th className="p-2">Tovar</th>
                    <th className="p-2">Brend</th>
                    <th className="p-2 text-center">Soni</th>
                    <th className="p-2 text-right">Sotuv summasi</th>
                    <th className="p-2 text-right">Foyda</th>
                  </tr>
                </thead>
                <tbody>
                  {productBreakdown.map((p) => (
                    <tr key={p.productId} className="border-b last:border-0">
                      <td className="p-2 font-medium">{p.name}</td>
                      <td className="p-2 text-gray-600">{p.vehicle}</td>
                      <td className="p-2 text-center tabular-nums">{p.totalQty}</td>
                      <td className="p-2 text-right tabular-nums">{formatSom(p.totalRevenue)}</td>
                      <td className="p-2 text-right text-green-700 font-semibold tabular-nums">
                        +{formatSom(p.totalProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tranzaksiyalar */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Sotuvlar tafsiloti
              </h3>
              <table className="w-full text-left text-xs border">
                <thead>
                  <tr className="bg-gray-100 border-b font-bold">
                    <th className="p-2">Sana</th>
                    <th className="p-2">Mijoz</th>
                    <th className="p-2 text-right">Chegirma</th>
                    <th className="p-2 text-right">Jami</th>
                    <th className="p-2 text-right">Foyda</th>
                    <th className="p-2">To'lov</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales
                    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                    .slice(0, 30)
                    .map((s) => {
                      const c = customers.find((x) => x.id === s.customerId);
                      return (
                        <tr key={s.id} className="border-b last:border-0">
                          <td className="p-2 tabular-nums">
                            {new Date(s.date).toLocaleDateString("uz-UZ")}
                          </td>
                          <td className="p-2 font-medium">{c?.name || "Umumiy mijoz"}</td>
                          <td className="p-2 text-right text-red-600 tabular-nums">
                            {s.discount > 0 ? `−${formatSom(s.discount)}` : "—"}
                          </td>
                          <td className="p-2 text-right font-semibold tabular-nums">
                            {formatSom(s.total)}
                          </td>
                          <td className="p-2 text-right text-green-700 font-semibold tabular-nums">
                            +{formatSom(s.profit)}
                          </td>
                          <td className="p-2">{paymentLabel(t, s.paymentType)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-4 text-center text-[10px] text-gray-400">
              {t("common.autoGenerated")}
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setPrintOpen(false)}>
              {t("common.close")}
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> {t("reports.printTitle")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
