import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, PageHeader } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSom } from "@/lib/constants";
import {
  Wallet, TrendingUp, Calendar, CalendarDays, PiggyBank, Receipt, Users, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { products, sales, expenses, employees, customers, suppliers, vehicleFilter } = useStore();
  const [detail, setDetail] = useState<null | "warehouse" | "today" | "week" | "month" | "profit" | "expenses" | "salary" | "net" | "debt">(null);


  const filtered = useMemo(() => {
    if (vehicleFilter === "all") return { products, sales };
    const productIds = new Set(products.filter(p => p.vehicle === vehicleFilter).map(p => p.id));
    return {
      products: products.filter(p => p.vehicle === vehicleFilter),
      sales: sales.filter(s => s.items.some(i => productIds.has(i.productId))),
    };
  }, [products, sales, vehicleFilter]);

  const warehouseValue = filtered.products.reduce((a, p) => a + p.buyPrice * p.quantity, 0);
  const today = new Date(); today.setHours(0,0,0,0);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);

  const sum = (arr: typeof sales) => arr.reduce((a, s) => a + s.total, 0);
  const todaySales = sum(filtered.sales.filter(s => new Date(s.date) >= today));
  const weekSales = sum(filtered.sales.filter(s => new Date(s.date) >= weekAgo));
  const monthSales = sum(filtered.sales.filter(s => new Date(s.date) >= monthAgo));
  const totalProfit = filtered.sales.reduce((a, s) => a + s.profit, 0);
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const salaryExpense = employees.filter(e => e.status === "Faol").reduce((a, e) => a + e.salary, 0);
  const netProfit = totalProfit - totalExpenses;
  const totalDebt = customers.reduce((a, c) => a + c.debt, 0) + suppliers.reduce((a, s) => a + s.debt, 0);

  const dailyData = useMemo(() => {
    const days: { date: string; sotuv: number; foyda: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const s = filtered.sales.filter(x => { const dx = new Date(x.date); return dx >= d && dx < next; });
      days.push({
        date: d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" }),
        sotuv: sum(s),
        foyda: s.reduce((a, x) => a + x.profit, 0),
      });
    }
    return days;
  }, [filtered.sales]);

  const monthlyData = useMemo(() => {
    const months: { month: string; foyda: number; sotuv: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1); d.setHours(0,0,0,0);
      const next = new Date(d); next.setMonth(next.getMonth() + 1);
      const s = filtered.sales.filter(x => { const dx = new Date(x.date); return dx >= d && dx < next; });
      months.push({
        month: d.toLocaleDateString("uz-UZ", { month: "short" }),
        foyda: s.reduce((a, x) => a + x.profit, 0),
        sotuv: sum(s),
      });
    }
    return months;
  }, [filtered.sales]);

  const brandPie = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => {
      s.items.forEach(i => {
        const p = products.find(pr => pr.id === i.productId);
        if (!p) return;
        map.set(p.vehicle, (map.get(p.vehicle) || 0) + i.price * i.qty);
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 6);
  }, [sales, products]);

  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach(s => s.items.forEach(i => map.set(i.productId, (map.get(i.productId) || 0) + i.qty)));
    return Array.from(map.entries())
      .map(([id, qty]) => ({ name: products.find(p => p.id === id)?.name || "?", qty }))
      .sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [sales, products]);

  const lowStock = filtered.products.filter(p => p.quantity > 0 && p.quantity <= p.minQty).slice(0, 6);
  const outStock = filtered.products.filter(p => p.quantity === 0).slice(0, 4);
  const recentSales = [...sales].sort((a,b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6);
  const pendingSalaries = employees.filter(e => e.advance < e.salary).slice(0, 5);

  const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--primary)"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boshqaruv paneli"
        subtitle={vehicleFilter === "all" ? "Umumiy ko'rsatkichlar" : `Filter: ${vehicleFilter}`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Ombor qiymati" value={formatSom(warehouseValue)} icon={Wallet} accent="primary" onClick={() => setDetail("warehouse")} />
        <StatCard label="Bugungi sotuv" value={formatSom(todaySales)} icon={TrendingUp} accent="success" onClick={() => setDetail("today")} />
        <StatCard label="Haftalik sotuv" value={formatSom(weekSales)} icon={Calendar} accent="info" onClick={() => setDetail("week")} />
        <StatCard label="Oylik sotuv" value={formatSom(monthSales)} icon={CalendarDays} accent="info" onClick={() => setDetail("month")} />
        <StatCard label="Yalpi foyda" value={formatSom(totalProfit)} icon={PiggyBank} accent="success" onClick={() => setDetail("profit")} />
        <StatCard label="Xarajatlar" value={formatSom(totalExpenses)} icon={Receipt} accent="warning" onClick={() => setDetail("expenses")} />
        <StatCard label="Ish haqi (oylik)" value={formatSom(salaryExpense)} icon={Users} accent="primary" onClick={() => setDetail("salary")} />
        <StatCard label="Sof foyda" value={formatSom(netProfit)} icon={netProfit >= 0 ? PiggyBank : AlertTriangle} accent={netProfit >= 0 ? "success" : "destructive"} onClick={() => setDetail("net")} />
        <StatCard label="Qarzdorlik" value={formatSom(totalDebt)} icon={AlertTriangle} accent="destructive" onClick={() => setDetail("debt")} />
      </div>

      <DetailDialog
        kind={detail}
        onClose={() => setDetail(null)}
        ctx={{ products: filtered.products, sales: filtered.sales, expenses, employees, customers, suppliers }}
      />


      {(lowStock.length > 0 || outStock.length > 0) && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning-foreground mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Diqqat: ombor holatini tekshiring</div>
            <div className="text-muted-foreground mt-0.5">
              {lowStock.length} ta mahsulot kam qoldi, {outStock.length} ta tugagan.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Kunlik sotuv (14 kun)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v/1e6).toFixed(1)}M`} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatSom(v)} />
                <Line type="monotone" dataKey="sotuv" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="foyda" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Brendlar bo'yicha sotuv</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={brandPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {brandPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatSom(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Oylik foyda (6 oy)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v/1e6).toFixed(0)}M`} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatSom(v)} />
                <Bar dataKey="foyda" fill="var(--chart-2)" radius={[8,8,0,0]} />
                <Bar dataKey="sotuv" fill="var(--chart-1)" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Eng ko'p sotilgan tovarlar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} width={130} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="qty" fill="var(--chart-1)" radius={[0,8,8,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Kam qolgan tovarlar</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">Hammasi yetarli</div>}
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.vehicle} · {p.category}</div>
                </div>
                <Badge variant="destructive" className="ml-2">{p.quantity} dona</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">So'nggi tranzaksiyalar</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentSales.map(s => {
              const cust = customers.find(c => c.id === s.customerId);
              return (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{cust?.name || "Mijoz"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleDateString("uz-UZ")} · {s.paymentType}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{formatSom(s.total)}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-base">Ish haqi to'lovlari</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingSalaries.map(e => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums">{formatSom(e.salary - e.advance)}</div>
                  <div className="text-[10px] text-muted-foreground">qoldi</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
