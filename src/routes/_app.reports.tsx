import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, Wallet, Receipt, Printer } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

function ReportsPage() {
  const { sales, expenses, products, customers } = useStore();
  const [printOpen, setPrintOpen] = useState(false);

  const totalSales = sales.reduce((a, s) => a + s.total, 0);
  const totalProfit = sales.reduce((a, s) => a + s.profit, 0);
  const totalExpense = expenses.reduce((a, e) => a + e.amount, 0);

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

  const exportExcel = () => {
    // Generate styled HTML Excel content that Excel parses perfectly
    const html = `
      <html xmlns:o="urn:schemas-microsoft-xml-soap:office:office" xmlns:x="urn:schemas-microsoft-xml-soap:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: sans-serif; font-size: 11pt; }
          th { background-color: #2563eb; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; }
          td { border: 1px solid #cbd5e1; padding: 8px; }
          h2 { color: #1e293b; margin-bottom: 2px; }
          .summary { background-color: #f8fafc; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>AutoERP Pro — Biznes Hisoboti</h2>
        <p>Sana: ${new Date().toLocaleString("uz-UZ")}</p>
        
        <h3>Moliyaviy Ko'rsatkichlar</h3>
        <table>
          <thead>
            <tr>
              <th>Ko'rsatkich</th>
              <th>Summa (so'm)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Jami sotuv</td><td>${totalSales}</td></tr>
            <tr><td>Sof foyda</td><td>${totalProfit}</td></tr>
            <tr><td>Jami xarajat</td><td>${totalExpense}</td></tr>
            <tr class="summary"><td>Net balans</td><td>${totalProfit - totalExpense}</td></tr>
          </tbody>
        </table>

        <h3>Oxirgi Sotuvlar</h3>
        <table>
          <thead>
            <tr>
              <th>Sana</th>
              <th>Mijoz</th>
              <th>Jami sotuv (so'm)</th>
              <th>Sof foyda (so'm)</th>
              <th>To'lov turi</th>
            </tr>
          </thead>
          <tbody>
            ${sales.map(s => `
              <tr>
                <td>${new Date(s.date).toLocaleDateString("uz-UZ")}</td>
                <td>${customers.find(c => c.id === s.customerId)?.name || "Umumiy mijoz"}</td>
                <td>${s.total}</td>
                <td>${s.profit}</td>
                <td>${s.paymentType}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <h3>Xarajatlar</h3>
        <table>
          <thead>
            <tr>
              <th>Sana</th>
              <th>Kategoriya</th>
              <th>Summa (so'm)</th>
              <th>Izoh</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map(e => `
              <tr>
                <td>${new Date(e.date).toLocaleDateString("uz-UZ")}</td>
                <td>${e.category}</td>
                <td>${e.amount}</td>
                <td>${e.note || ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `autoerp_hisobot_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    toast.success("Excel hisobot yuklandi");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Hisobotlar" subtitle="Sotuv, foyda va inventarizatsiya tahlili" actions={
        <>
          <Button variant="outline" onClick={() => setPrintOpen(true)}><FileText className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
        </>
      } />

      {/* PDF Print Preview Dialog */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-4xl p-6 bg-card border rounded-2xl shadow-elevated overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Hisobotni Chop etish (PDF)
            </DialogTitle>
          </DialogHeader>

          {/* Printable Report Area */}
          <div id="print-area" className="p-6 bg-white text-black font-sans text-sm space-y-6 rounded-xl border shadow-sm">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">AutoERP Pro</h1>
                <p className="text-xs text-gray-500 mt-1">Avtomatlashtirilgan Ombor va Sotuv Tizimi</p>
              </div>
              <div className="text-right">
                <h2 className="text-sm font-bold text-gray-700">BIZNES HISOBOTI</h2>
                <p className="text-xs text-gray-500 mt-1">Sana: {new Date().toLocaleDateString("uz-UZ")}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Moliyaviy Ko'rsatkichlar</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="border p-3 rounded-lg bg-gray-50">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Jami Sotuv</span>
                  <span className="text-base font-bold tabular-nums text-gray-900">{formatSom(totalSales)}</span>
                </div>
                <div className="border p-3 rounded-lg bg-gray-50">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Jami Xarajat</span>
                  <span className="text-base font-bold tabular-nums text-gray-900">{formatSom(totalExpense)}</span>
                </div>
                <div className="border p-3 rounded-lg bg-gray-50">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">Sof Foyda</span>
                  <span className="text-base font-bold tabular-nums text-green-700">+{formatSom(totalProfit)}</span>
                </div>
              </div>
            </div>

            {/* Sales Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Sotuvlar Tafsiloti (Oxirgi 15 ta)</h3>
              <table className="w-full text-left text-xs border">
                <thead>
                  <tr className="bg-gray-100 border-b font-bold">
                    <th className="p-2">Sana</th>
                    <th className="p-2">Mijoz</th>
                    <th className="p-2 text-right">Chegirma</th>
                    <th className="p-2 text-right">Jami sum</th>
                    <th className="p-2 text-right">Foyda</th>
                    <th className="p-2">To'lov</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 15).map(s => {
                    const c = customers.find(x => x.id === s.customerId);
                    return (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="p-2 tabular-nums">{new Date(s.date).toLocaleDateString("uz-UZ")}</td>
                        <td className="p-2 font-medium">{c?.name || "Umumiy mijoz"}</td>
                        <td className="p-2 text-right text-red-600 tabular-nums">-{formatSom(s.discount)}</td>
                        <td className="p-2 text-right font-semibold tabular-nums">{formatSom(s.total)}</td>
                        <td className="p-2 text-right text-green-700 font-semibold tabular-nums">+{formatSom(s.profit)}</td>
                        <td className="p-2">{s.paymentType}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expenses Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Xarajatlar Tafsiloti (Oxirgi 10 ta)</h3>
              <table className="w-full text-left text-xs border">
                <thead>
                  <tr className="bg-gray-100 border-b font-bold">
                    <th className="p-2">Sana</th>
                    <th className="p-2">Kategoriya</th>
                    <th className="p-2 text-right">Summa</th>
                    <th className="p-2">Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 10).map(e => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="p-2 tabular-nums">{new Date(e.date).toLocaleDateString("uz-UZ")}</td>
                      <td className="p-2 font-medium">{e.category}</td>
                      <td className="p-2 text-right text-red-600 font-semibold tabular-nums">{formatSom(e.amount)}</td>
                      <td className="p-2 text-gray-600 max-w-[200px] truncate">{e.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-4 text-center text-[10px] text-gray-400">
              AutoERP Pro tizimi tomonidan avtomatik yaratildi.
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setPrintOpen(false)}>Yopish</Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Chop etish (PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Jami sotuv" value={formatSom(totalSales)} icon={Wallet} accent="primary" />
        <StatCard label="Jami foyda" value={formatSom(totalProfit)} icon={TrendingUp} accent="success" />
        <StatCard label="Jami xarajat" value={formatSom(totalExpense)} icon={Receipt} accent="warning" />
      </div>

      <Card className="rounded-2xl card-elevated border-border/60">
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

      <Card className="rounded-2xl card-elevated border-border/60">
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
