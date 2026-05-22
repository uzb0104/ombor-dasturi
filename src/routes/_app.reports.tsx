import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, Wallet, Receipt } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

function ReportsPage() {
  const { sales, expenses, products } = useStore();
  const totalSales = sales.reduce((a,s) => a + s.total, 0);
  const totalProfit = sales.reduce((a,s) => a + s.profit, 0);
  const totalExpense = expenses.reduce((a,e) => a + e.amount, 0);

  const trend = useMemo(() => {
    const map = new Map<string, { sotuv: number; foyda: number }>();
    sales.forEach(s => {
      const k = new Date(s.date).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
      const v = map.get(k) || { sotuv: 0, foyda: 0 };
      map.set(k, { sotuv: v.sotuv + s.total, foyda: v.foyda + s.profit });
    });
    return Array.from(map.entries()).slice(-14).map(([date, v]) => ({ date, ...v }));
  }, [sales]);

  const byBrand = useMemo(() => {
    const m = new Map<string, number>();
    sales.forEach(s => s.items.forEach(i => {
      const p = products.find(x => x.id === i.productId); if (!p) return;
      m.set(p.vehicle, (m.get(p.vehicle) || 0) + i.price * i.qty);
    }));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [sales, products]);

  return (
    <div className="space-y-5">
      <PageHeader title="Hisobotlar" subtitle="Sotuv, foyda va inventarizatsiya tahlili" actions={
        <>
          <Button variant="outline" onClick={() => toast.success("PDF tayyorlanmoqda...")}><FileText className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" onClick={() => toast.success("Excel yuklanmoqda...")}><Download className="h-4 w-4 mr-1" />Excel</Button>
        </>
      } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Jami sotuv" value={formatSom(totalSales)} icon={Wallet} accent="primary" />
        <StatCard label="Jami foyda" value={formatSom(totalProfit)} icon={TrendingUp} accent="success" />
        <StatCard label="Jami xarajat" value={formatSom(totalExpense)} icon={Receipt} accent="warning" />
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Sotuv va foyda dinamikasi</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v/1e6).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatSom(v)} />
              <Line type="monotone" dataKey="sotuv" stroke="var(--chart-1)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="foyda" stroke="var(--chart-2)" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Brendlar bo'yicha sotuv</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byBrand}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v/1e6).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatSom(v)} />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
