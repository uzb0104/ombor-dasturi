import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, PageHeader } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSom } from "@/lib/constants";
import {
  Wallet,
  TrendingUp,
  Calendar,
  CalendarDays,
  PiggyBank,
  Receipt,
  Users,
  AlertTriangle,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useT } from "@/lib/i18n";
import { paymentLabel } from "@/lib/i18n/helpers";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const t = useT();
  const { products, sales, expenses, employees, customers, suppliers, vehicleFilter } = useStore();
  const [detail, setDetail] = useState<
    | null
    | "warehouse"
    | "today"
    | "week"
    | "month"
    | "profit"
    | "expenses"
    | "salary"
    | "net"
    | "debt"
  >(null);

  const [systemHealth, setSystemHealth] = useState<{
    ok: boolean;
    supabase: boolean;
    redis: boolean;
    port: number;
    mode: string;
  } | null>(null);

  useEffect(() => {
    // API base URL ni env dan yoki default holatda aniqlaymiz
    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5001").replace(/\/+$/, "");
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data) => setSystemHealth(data))
      .catch(() => setSystemHealth(null));
  }, []);

  const filtered = useMemo(() => {
    if (vehicleFilter === "all") return { products, sales };
    const productIds = new Set(
      products.filter((p) => p.vehicle === vehicleFilter).map((p) => p.id),
    );
    return {
      products: products.filter((p) => p.vehicle === vehicleFilter),
      sales: sales.filter((s) => s.items.some((i) => productIds.has(i.productId))),
    };
  }, [products, sales, vehicleFilter]);

  const warehouseValue = filtered.products.reduce((a, p) => a + p.buyPrice * p.quantity, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const sum = (arr: typeof sales) => arr.reduce((a, s) => a + s.total, 0);
  const todaySales = sum(filtered.sales.filter((s) => new Date(s.date) >= today));
  const weekSales = sum(filtered.sales.filter((s) => new Date(s.date) >= weekAgo));
  const monthSales = sum(filtered.sales.filter((s) => new Date(s.date) >= monthAgo));
  const totalProfit = filtered.sales.reduce((a, s) => a + s.profit, 0);
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const salaryExpense = employees
    .filter((e) => e.status === "Faol")
    .reduce((a, e) => a + e.salary, 0);
  const netProfit = totalProfit - totalExpenses;
  const totalDebt =
    customers.reduce((a, c) => a + c.debt, 0) + suppliers.reduce((a, s) => a + s.debt, 0);

  const dailyData = useMemo(() => {
    const days: { date: string; sotuv: number; foyda: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const s = filtered.sales.filter((x) => {
        const dx = new Date(x.date);
        return dx >= d && dx < next;
      });
      days.push({
        date: d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" }),
        sotuv: sum(s),
        foyda: s.reduce((a, x) => a + x.profit, 0),
      });
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.sales]);

  const monthlyData = useMemo(() => {
    const months: { month: string; foyda: number; sotuv: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      const s = filtered.sales.filter((x) => {
        const dx = new Date(x.date);
        return dx >= d && dx < next;
      });
      months.push({
        month: d.toLocaleDateString("uz-UZ", { month: "short" }),
        foyda: s.reduce((a, x) => a + x.profit, 0),
        sotuv: sum(s),
      });
    }
    return months;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.sales]);

  const brandPie = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => {
      s.items.forEach((i) => {
        const p = products.find((pr) => pr.id === i.productId);
        if (!p) return;
        map.set(p.vehicle, (map.get(p.vehicle) || 0) + i.price * i.qty);
      });
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [sales, products]);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) =>
      s.items.forEach((i) => map.set(i.productId, (map.get(i.productId) || 0) + i.qty)),
    );
    return Array.from(map.entries())
      .map(([id, qty]) => ({ name: products.find((p) => p.id === id)?.name || "?", qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [sales, products]);

  const lowStock = filtered.products
    .filter((p) => p.quantity > 0 && p.quantity <= p.minQty)
    .slice(0, 6);
  const outStock = filtered.products.filter((p) => p.quantity === 0).slice(0, 4);
  const recentSales = [...sales].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6);
  const pendingSalaries = employees.filter((e) => e.advance < e.salary).slice(0, 5);

  const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--primary)",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        subtitle={
          vehicleFilter === "all"
            ? t("dashboard.subtitleAll")
            : t("dashboard.subtitleFilter", { brand: vehicleFilter })
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label={t("dashboard.warehouseValue")}
          value={formatSom(warehouseValue)}
          icon={Wallet}
          accent="primary"
          onClick={() => setDetail("warehouse")}
        />
        <StatCard
          label={t("dashboard.todaySales")}
          value={formatSom(todaySales)}
          icon={TrendingUp}
          accent="success"
          onClick={() => setDetail("today")}
        />
        <StatCard
          label={t("dashboard.weekSales")}
          value={formatSom(weekSales)}
          icon={Calendar}
          accent="info"
          onClick={() => setDetail("week")}
        />
        <StatCard
          label={t("dashboard.monthSales")}
          value={formatSom(monthSales)}
          icon={CalendarDays}
          accent="info"
          onClick={() => setDetail("month")}
        />
        <StatCard
          label={t("dashboard.grossProfit")}
          value={formatSom(totalProfit)}
          icon={PiggyBank}
          accent="success"
          onClick={() => setDetail("profit")}
        />
        <StatCard
          label={t("dashboard.expenses")}
          value={formatSom(totalExpenses)}
          icon={Receipt}
          accent="warning"
          onClick={() => setDetail("expenses")}
        />
        <StatCard
          label={t("dashboard.salary")}
          value={formatSom(salaryExpense)}
          icon={Users}
          accent="primary"
          onClick={() => setDetail("salary")}
        />
        <StatCard
          label={t("dashboard.netProfit")}
          value={formatSom(netProfit)}
          icon={netProfit >= 0 ? PiggyBank : AlertTriangle}
          accent={netProfit >= 0 ? "success" : "destructive"}
          onClick={() => setDetail("net")}
        />
        <StatCard
          label={t("dashboard.debt")}
          value={formatSom(totalDebt)}
          icon={AlertTriangle}
          accent="destructive"
          onClick={() => setDetail("debt")}
        />
      </div>

      {/* {systemHealth && (
        <Card className="rounded-2xl bg-card border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-tight text-muted-foreground uppercase flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Tizim holati diagnostikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Server status
              </span>
              <span className="text-xs font-bold text-emerald-500 mt-0.5">
                Ishlamoqda (Port: {systemHealth.port})
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                DB rejim
              </span>
              <span className="text-xs font-bold text-foreground mt-0.5">
                {systemHealth.mode === "supabase" ? "Supabase Cloud" : "Mahalliy JSON DB"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Supabase ulanishi
              </span>
              <span
                className={`text-xs font-bold mt-0.5 ${systemHealth.supabase ? "text-emerald-500" : "text-destructive"}`}
              >
                {systemHealth.supabase ? "Muvaffaqiyatli" : "Ulanmagan"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Redis kesh
              </span>
              <span
                className={`text-xs font-bold mt-0.5 ${systemHealth.redis ? "text-emerald-500" : "text-amber-500"}`}
              >
                {systemHealth.redis ? "Faol (Tezkor)" : "In-Memory (Keshlanmagan)"}
              </span>
            </div>
          </CardContent>
        </Card>
      )} */}

      <DetailDialog
        kind={detail}
        onClose={() => setDetail(null)}
        ctx={{
          products: filtered.products,
          sales: filtered.sales,
          expenses,
          employees,
          customers,
          suppliers,
        }}
      />

      {(lowStock.length > 0 || outStock.length > 0) && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning-foreground mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">{t("dashboard.stockAlert")}</div>
            <div className="text-muted-foreground mt-0.5">
              {t("dashboard.stockAlertDesc", { low: lowStock.length, out: outStock.length })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.chartDaily")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyData}>
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
                  formatter={(v: number) => formatSom(v)}
                />
                <Line
                  type="monotone"
                  dataKey="sotuv"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="foyda"
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.chartBrand")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={brandPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {brandPie.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => formatSom(v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.chartMonthly")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => formatSom(v)}
                />
                <Bar dataKey="foyda" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="sotuv" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.chartTop")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  width={130}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="qty" fill="var(--chart-1)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.lowStockCard")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                {t("dashboard.allStockOk")}
              </div>
            )}
            {lowStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.vehicle} · {p.category}
                  </div>
                </div>
                <Badge variant="destructive" className="ml-2">
                  {p.quantity} {t("common.pcsUnit")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.recentTx")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSales.map((s) => {
              const cust = customers.find((c) => c.id === s.customerId);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {cust?.name || t("sales.customer")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleDateString("uz-UZ")} ·{" "}
                      {paymentLabel(t, s.paymentType)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{formatSom(s.total)}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("dashboard.salaryPayments")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingSalaries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">
                    {formatSom(e.salary - e.advance)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t("dashboard.remaining")}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type DetailKind =
  | "warehouse"
  | "today"
  | "week"
  | "month"
  | "profit"
  | "expenses"
  | "salary"
  | "net"
  | "debt"
  | null;

function DetailDialog({
  kind,
  onClose,
  ctx,
}: {
  kind: DetailKind;
  onClose: () => void;
  ctx: {
    products: ReturnType<typeof useStore.getState>["products"];
    sales: ReturnType<typeof useStore.getState>["sales"];
    expenses: ReturnType<typeof useStore.getState>["expenses"];
    employees: ReturnType<typeof useStore.getState>["employees"];
    customers: ReturnType<typeof useStore.getState>["customers"];
    suppliers: ReturnType<typeof useStore.getState>["suppliers"];
  };
}) {
  const t = useT();
  if (!kind) return null;
  const titles: Record<Exclude<DetailKind, null>, string> = {
    warehouse: t("dashboard.detail.warehouse"),
    today: t("dashboard.detail.today"),
    week: t("dashboard.detail.week"),
    month: t("dashboard.detail.month"),
    profit: t("dashboard.detail.profit"),
    expenses: t("dashboard.detail.expenses"),
    salary: t("dashboard.detail.salary"),
    net: t("dashboard.detail.net"),
    debt: t("dashboard.detail.debt"),
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const filterSales = (from?: Date) =>
    ctx.sales
      .filter((s) => !from || new Date(s.date) >= from)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <Dialog open={!!kind} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[kind]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {kind === "warehouse" && (
            <List
              rows={[...ctx.products]
                .sort((a, b) => b.buyPrice * b.quantity - a.buyPrice * a.quantity)
                .map((p) => ({
                  key: p.id,
                  title: p.name,
                  sub: `${p.vehicle} · ${p.quantity} ${t("common.pcsUnit")} × ${formatSom(p.buyPrice)}`,
                  amount: formatSom(p.buyPrice * p.quantity),
                }))}
            />
          )}
          {(kind === "today" || kind === "week" || kind === "month") && (
            <SaleList
              sales={filterSales(kind === "today" ? now : kind === "week" ? weekAgo : monthAgo)}
              customers={ctx.customers}
              field="total"
              sign="+"
            />
          )}
          {kind === "profit" && (
            <SaleList sales={filterSales()} customers={ctx.customers} field="profit" sign="+" />
          )}
          {kind === "expenses" && (
            <List
              rows={[...ctx.expenses]
                .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                .map((e) => ({
                  key: e.id,
                  title: e.category,
                  sub: `${new Date(e.date).toLocaleDateString("uz-UZ")} · ${e.note || "—"}`,
                  amount: `−${formatSom(e.amount)}`,
                  tone: "destructive" as const,
                }))}
            />
          )}
          {kind === "salary" && (
            <List
              rows={ctx.employees
                .filter((e) => e.status === "Faol")
                .map((e) => ({
                  key: e.id,
                  title: e.name,
                  sub: e.role,
                  amount: formatSom(e.salary),
                }))}
            />
          )}
          {kind === "net" && (
            <>
              <div className="font-semibold text-success">{t("dashboard.profitSection")}</div>
              <SaleList sales={filterSales()} customers={ctx.customers} field="profit" sign="+" />
              <div className="font-semibold text-destructive pt-2">{t("dashboard.expenses")}</div>
              <List
                rows={[...ctx.expenses]
                  .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                  .map((e) => ({
                    key: e.id,
                    title: e.category,
                    sub: new Date(e.date).toLocaleDateString("uz-UZ"),
                    amount: `−${formatSom(e.amount)}`,
                    tone: "destructive" as const,
                  }))}
              />
            </>
          )}
          {kind === "debt" && (
            <>
              <div className="font-semibold">{t("dashboard.customerDebt")}</div>
              <List
                rows={ctx.customers
                  .filter((c) => c.debt > 0)
                  .map((c) => ({
                    key: c.id,
                    title: c.name,
                    sub: c.phone,
                    amount: formatSom(c.debt),
                    tone: "destructive" as const,
                  }))}
              />
              <div className="font-semibold pt-2">{t("dashboard.supplierDebt")}</div>
              <List
                rows={ctx.suppliers
                  .filter((s) => s.debt > 0)
                  .map((s) => ({
                    key: s.id,
                    title: s.name,
                    sub: s.phone,
                    amount: formatSom(s.debt),
                    tone: "destructive" as const,
                  }))}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function List({
  rows,
}: {
  rows: {
    key: string;
    title: string;
    sub: string;
    amount: string;
    tone?: "destructive" | "success";
  }[];
}) {
  const t = useT();
  if (rows.length === 0)
    return <div className="text-muted-foreground text-center py-4">{t("audit.notFound")}</div>;
  return (
    <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between px-3 py-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{r.title}</div>
            <div className="text-xs text-muted-foreground truncate">{r.sub}</div>
          </div>
          <div
            className={`tabular-nums font-semibold whitespace-nowrap ml-2 ${r.tone === "destructive" ? "text-destructive" : r.tone === "success" ? "text-success" : ""}`}
          >
            {r.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

function SaleList({
  sales,
  customers,
  field,
  sign,
}: {
  sales: ReturnType<typeof useStore.getState>["sales"];
  customers: ReturnType<typeof useStore.getState>["customers"];
  field: "total" | "profit";
  sign: "+" | "−";
}) {
  const t = useT();
  return (
    <List
      rows={sales.map((s) => {
        const cust = customers.find((c) => c.id === s.customerId);
        return {
          key: s.id,
          title: cust?.name || t("sales.customer"),
          sub: `${new Date(s.date).toLocaleDateString("uz-UZ")} · ${paymentLabel(t, s.paymentType)} · ${s.items.length} ${t("common.itemsUnit")}`,
          amount: `${sign}${formatSom(s[field])}`,
          tone: "success" as const,
        };
      })}
    />
  );
}
