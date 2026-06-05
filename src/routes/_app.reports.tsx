import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, Wallet, Receipt, Printer } from "lucide-react";
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
import { useMemo, useState, useEffect } from "react";
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
import type { PriceHistoryEntry } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

function ReportsPage() {
  const t = useT();
  const { sales, expenses, products, customers } = useStore();
  const [printOpen, setPrintOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);

  useEffect(() => {
    priceHistoryApi
      .getAll()
      .then((data) => setPriceHistory(data))
      .catch(() => {});
  }, []);

  const totalSales = sales.reduce((a, s) => a + s.total, 0);
  const totalProfit = sales.reduce((a, s) => a + s.profit, 0);
  const totalExpense = expenses.reduce((a, e) => a + e.amount, 0);

  const trend = useMemo(() => {
    const map = new Map<string, { sotuv: number; foyda: number }>();
    sales.forEach((s) => {
      const k = new Date(s.date).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
      const v = map.get(k) || { sotuv: 0, foyda: 0 };
      map.set(k, { sotuv: v.sotuv + s.total, foyda: v.foyda + s.profit });
    });
    return Array.from(map.entries())
      .slice(-14)
      .map(([date, v]) => ({ date, ...v }));
  }, [sales]);

  const byBrand = useMemo(() => {
    const m = new Map<string, number>();
    sales.forEach((s) =>
      s.items.forEach((i) => {
        const p = products.find((x) => x.id === i.productId);
        if (!p) return;
        m.set(p.vehicle, (m.get(p.vehicle) || 0) + i.price * i.qty);
      }),
    );
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [sales, products]);

  const exportExcel = () => {
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
        <h2>${t("reports.excelTitle")}</h2>
        <p>${t("common.date")}: ${new Date().toLocaleString("uz-UZ")}</p>
        
        <h3>${t("reports.financial")}</h3>
        <table>
          <thead>
            <tr>
              <th>${t("reports.metric")}</th>
              <th>${t("reports.amountSom")}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>${t("reports.totalSalesLabel")}</td><td>${totalSales}</td></tr>
            <tr><td>${t("reports.netProfitLabel")}</td><td>${totalProfit}</td></tr>
            <tr><td>${t("reports.totalExpenseLabel")}</td><td>${totalExpense}</td></tr>
            <tr class="summary"><td>${t("common.netBalance")}</td><td>${totalProfit - totalExpense}</td></tr>
          </tbody>
        </table>

        <h3>${t("reports.recentSales")}</h3>
        <table>
          <thead>
            <tr>
              <th>${t("common.date")}</th>
              <th>${t("sales.customer")}</th>
              <th>${t("reports.totalSalesLabel")} (${t("reports.amountSom")})</th>
              <th>${t("reports.profitSom")}</th>
              <th>${t("sales.payment")}</th>
            </tr>
          </thead>
          <tbody>
            ${sales
              .map(
                (s) => `
              <tr>
                <td>${new Date(s.date).toLocaleDateString("uz-UZ")}</td>
                <td>${customers.find((c) => c.id === s.customerId)?.name || t("sales.generalCustomer")}</td>
                <td>${s.total}</td>
                <td>${s.profit}</td>
                <td>${s.paymentType}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <h3>${t("dashboard.expenses")}</h3>
        <table>
          <thead>
            <tr>
              <th>${t("common.date")}</th>
              <th>${t("expenses.category")}</th>
              <th>${t("reports.amountSom")}</th>
              <th>${t("expenses.note")}</th>
            </tr>
          </thead>
          <tbody>
            ${expenses
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
    a.download = `autoerp_hisobot_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    toast.success(t("reports.excelDownloaded"));
  };

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

      {/* PDF Print Preview Dialog */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-4xl p-6 bg-card border rounded-2xl shadow-elevated overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> {t("reports.printDialog")}
            </DialogTitle>
          </DialogHeader>

          {/* Printable Report Area */}
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
                <h2 className="text-sm font-bold text-gray-700">{t("reports.reportTitle")}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {t("common.date")}: {new Date().toLocaleDateString("uz-UZ")}
                </p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {t("reports.financial")}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="border p-3 rounded-lg bg-gray-50">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">
                    {t("reports.totalSalesLabel")}
                  </span>
                  <span className="text-base font-bold tabular-nums text-gray-900">
                    {formatSom(totalSales)}
                  </span>
                </div>
                <div className="border p-3 rounded-lg bg-gray-50">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">
                    {t("reports.totalExpenseLabel")}
                  </span>
                  <span className="text-base font-bold tabular-nums text-gray-900">
                    {formatSom(totalExpense)}
                  </span>
                </div>
                <div className="border p-3 rounded-lg bg-gray-50">
                  <span className="text-[10px] text-gray-500 block uppercase font-medium">
                    {t("reports.netProfitLabel")}
                  </span>
                  <span className="text-base font-bold tabular-nums text-green-700">
                    +{formatSom(totalProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sales Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {t("reports.salesDetail")}
              </h3>
              <table className="w-full text-left text-xs border">
                <thead>
                  <tr className="bg-gray-100 border-b font-bold">
                    <th className="p-2">{t("common.date")}</th>
                    <th className="p-2">{t("sales.customer")}</th>
                    <th className="p-2 text-right">{t("reports.discountCol")}</th>
                    <th className="p-2 text-right">{t("reports.totalSumCol")}</th>
                    <th className="p-2 text-right">{t("reports.profitCol")}</th>
                    <th className="p-2">{t("reports.paymentCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 15).map((s) => {
                    const c = customers.find((x) => x.id === s.customerId);
                    return (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="p-2 tabular-nums">
                          {new Date(s.date).toLocaleDateString("uz-UZ")}
                        </td>
                        <td className="p-2 font-medium">{c?.name || t("sales.generalCustomer")}</td>
                        <td className="p-2 text-right text-red-600 tabular-nums">
                          -{formatSom(s.discount)}
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

            {/* Expenses Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {t("reports.expensesDetail")}
              </h3>
              <table className="w-full text-left text-xs border">
                <thead>
                  <tr className="bg-gray-100 border-b font-bold">
                    <th className="p-2">{t("common.date")}</th>
                    <th className="p-2">{t("expenses.type")}</th>
                    <th className="p-2 text-right">{t("common.amount")}</th>
                    <th className="p-2">{t("expenses.note")}</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 10).map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="p-2 tabular-nums">
                        {new Date(e.date).toLocaleDateString("uz-UZ")}
                      </td>
                      <td className="p-2 font-medium">{e.category}</td>
                      <td className="p-2 text-right text-red-600 font-semibold tabular-nums">
                        {formatSom(e.amount)}
                      </td>
                      <td className="p-2 text-gray-600 max-w-[200px] truncate">{e.note || "—"}</td>
                    </tr>
                  ))}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label={t("reports.totalSalesLabel")}
          value={formatSom(totalSales)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label={t("reports.totalProfit")}
          value={formatSom(totalProfit)}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label={t("reports.totalExpenseLabel")}
          value={formatSom(totalExpense)}
          icon={Receipt}
          accent="warning"
        />
      </div>

      <Card className="rounded-2xl card-elevated border-border/60">
        <CardHeader>
          <CardTitle className="text-base">{t("reports.chartTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
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
              <Line type="monotone" dataKey="sotuv" stroke="var(--chart-1)" strokeWidth={2.5} />
              <Line type="monotone" dataKey="foyda" stroke="var(--chart-2)" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl card-elevated border-border/60">
        <CardHeader>
          <CardTitle className="text-base">{t("reports.chartBrand")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byBrand}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
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
              <Bar dataKey="value" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl card-elevated border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Narx o'zgarishlar tarixi
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
    </div>
  );
}
