import { useMemo, useState } from "react";
import {
  Download,
  FileText,
  Package,
  Percent,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { formatSom } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { paymentLabel } from "@/lib/i18n/helpers";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

type Period = "today" | "week" | "month" | "all";

export function ReportsPage() {
  const t = useT();
  const { sales, expenses, products, customers } = useStore();
  const [period, setPeriod] = useState<Period>("today");

  const filteredSales = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const week = new Date(now);
    week.setDate(week.getDate() - 7);
    const month = new Date(now);
    month.setDate(month.getDate() - 30);
    return sales.filter((sale) => {
      const date = new Date(sale.date);
      if (period === "today") return date >= start;
      if (period === "week") return date >= week;
      if (period === "month") return date >= month;
      return true;
    });
  }, [period, sales]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const week = new Date(now);
    week.setDate(week.getDate() - 7);
    const month = new Date(now);
    month.setDate(month.getDate() - 30);
    return expenses.filter((expense) => {
      const date = new Date(expense.date);
      if (period === "today") return date >= start;
      if (period === "week") return date >= week;
      if (period === "month") return date >= month;
      return true;
    });
  }, [expenses, period]);

  const productBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { name: string; totalQty: number; totalRevenue: number; totalProfit: number }
    >();
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        const key = item.productId;
        const entry = map.get(key) || {
          name: product?.name || item.productName || "Noma'lum",
          totalQty: 0,
          totalRevenue: 0,
          totalProfit: 0,
        };
        entry.totalQty += item.qty;
        entry.totalRevenue += item.price * item.qty;
        entry.totalProfit += (item.price - item.buyPrice) * item.qty;
        map.set(key, entry);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSales, products]);

  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredSales.forEach((sale) => {
      const entry = map.get(sale.paymentType) || { count: 0, total: 0 };
      entry.count += 1;
      entry.total += sale.total;
      map.set(sale.paymentType, entry);
    });
    return Array.from(map.entries()).map(([type, data]) => ({ type, ...data }));
  }, [filteredSales]);

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
  const totalDiscount = filteredSales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
  const totalExpense = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalItemsSold = filteredSales.reduce(
    (sum, sale) => sum + sale.items.reduce((count, item) => count + item.qty, 0),
    0,
  );
  const txCount = filteredSales.length;

  const exportExcel = () => {
    const html = `
      <html><body><table>
        <tr><th>Period</th><th>Summa</th></tr>
        <tr><td>Jami sotuv</td><td>${totalSales}</td></tr>
        <tr><td>Jami foyda</td><td>${totalProfit}</td></tr>
        <tr><td>Chegirma</td><td>${totalDiscount}</td></tr>
      </table></body></html>
    `;
    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hisobot_${period}.xls`;
    link.click();
    toast.success(t("reports.excelDownloaded"));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={exportExcel}>
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </>
        }
      />

      <div className="flex gap-2">
        {(["today", "week", "month", "all"] as Period[]).map((value) => (
          <Button
            key={value}
            variant={value === period ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(value)}
          >
            {value === "today"
              ? t("common.today")
              : value === "week"
                ? t("common.week")
                : value === "month"
                  ? t("common.month")
                  : t("common.all")}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Jami sotuv" value={formatSom(totalSales)} icon={Wallet} accent="primary" />
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

      <Card className="rounded-2xl card-elevated border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Sotilgan tovarlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/40 border-b font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="p-3">Tovar</th>
                  <th className="p-3 text-center">Soni</th>
                  <th className="p-3 text-right">Sotuv summasi</th>
                  <th className="p-3 text-right">Foyda</th>
                </tr>
              </thead>
              <tbody>
                {productBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Ma'lumotlar yo'q
                    </td>
                  </tr>
                ) : (
                  productBreakdown.map((product) => (
                    <tr key={product.name} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{product.name}</td>
                      <td className="p-3 text-center">{product.totalQty}</td>
                      <td className="p-3 text-right">{formatSom(product.totalRevenue)}</td>
                      <td className="p-3 text-right font-bold text-success">
                        +{formatSom(product.totalProfit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl card-elevated border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Sotuvlar ro'yxati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/40 border-b font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="p-3">Sana</th>
                  <th className="p-3">Mijoz</th>
                  <th className="p-3">To'lov</th>
                  <th className="p-3 text-right">Umumiy summa</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      Bu davr uchun sotuvlar yo'q
                    </td>
                  </tr>
                ) : (
                  filteredSales.slice(0, 8).map((sale) => (
                    <tr key={sale.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">{new Date(sale.date).toLocaleDateString("uz-UZ")}</td>
                      <td className="p-3">
                        {customers.find((customer) => customer.id === sale.customerId)?.name ||
                          t("sales.generalCustomer")}
                      </td>
                      <td className="p-3">
                        <Badge variant={sale.paymentType === "Qarz" ? "destructive" : "secondary"}>
                          {paymentLabel(t, sale.paymentType)}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-semibold">{formatSom(sale.total)}</td>
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
