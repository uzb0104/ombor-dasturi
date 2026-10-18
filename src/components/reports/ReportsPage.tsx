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
import {
  PageHeader,
  StatCard,
  exportToExcel,
  PaginationBar,
  usePagination,
} from "@/components/ui-kit";
import { formatSom, formatUsd, formatDate, formatDateTime } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { paymentLabel } from "@/lib/i18n/helpers";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { ReportsPrintDialog, ProductBreakdownItem } from "./ReportsPrintDialog";

type Period = "today" | "week" | "month" | "all";

export function ReportsPage({ hideHeader }: { hideHeader?: boolean } = {}) {
  const t = useT();
  const { sales, expenses, products, customers, usdRate } = useStore();
  const activeRate = usdRate > 0 ? usdRate : 12835;

  const [period, setPeriod] = useState<Period>("today");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const week = new Date(now);
    week.setDate(week.getDate() - 7);
    const month = new Date(now);
    month.setDate(month.getDate() - 30);
    return sales
      .filter((sale) => {
        const date = new Date(sale.date);
        if (period === "today") return date >= start;
        if (period === "week") return date >= week;
        if (period === "month") return date >= month;
        return true;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
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

  const productBreakdown = useMemo<ProductBreakdownItem[]>(() => {
    const map = new Map<string, ProductBreakdownItem>();
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        const key = item.productId;
        const entry = map.get(key) || {
          productId: key,
          name: product?.name || item.productName || "Noma'lum",
          vehicle: product?.vehicle || "",
          totalQty: 0,
          totalRevenue: 0,
          totalProfit: 0,
          totalBuyValue: 0,
        };
        entry.totalQty += item.qty;
        entry.totalRevenue += item.price * item.qty;
        entry.totalProfit += (item.price - item.buyPrice) * item.qty;
        entry.totalBuyValue = (entry.totalBuyValue || 0) + item.buyPrice * item.qty;
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
  const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const totalDiscount = filteredSales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
  const totalExpense = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalItemsSold = filteredSales.reduce(
    (sum, sale) => sum + sale.items.reduce((count, item) => count + item.qty, 0),
    0,
  );
  const txCount = filteredSales.length;

  const {
    paged: paginatedSales,
    page,
    setPage,
    totalPages,
    totalItems,
    pageSize,
  } = usePagination(filteredSales, 50);

  const exportExcel = () => {
    let rowNum = 1;
    const rows = filteredSales.flatMap((sale) => {
      const customer = customers.find((c) => c.id === sale.customerId);
      return sale.items.map((item, idx) => {
        const product = products.find((p) => p.id === item.productId);
        const somTotal = idx === 0 ? sale.total : 0;
        return {
          number: rowNum++,
          date: formatDateTime(sale.date),
          customer: customer?.name || t("sales.generalCustomer"),
          phone: customer?.phone || "",
          product: product?.name || item.productName || t("sales.unknownProduct"),
          category: product?.category || "",
          qty: item.qty,
          priceSom: item.price,
          priceUsd: product?.sellPriceUsd || Number((item.price / activeRate).toFixed(2)),
          discountSom: idx === 0 ? sale.discount : 0,
          totalSom: somTotal,
          totalUsd: somTotal > 0 ? Number((somTotal / activeRate).toFixed(2)) : 0,
          payment: paymentLabel(t, sale.paymentType),
        };
      });
    });

    exportToExcel(
      rows,
      [
        { label: "№", key: "number" },
        { label: t("reports.date"), key: "date" },
        { label: t("sales.customer"), key: "customer" },
        { label: t("common.phone"), key: "phone" },
        { label: t("common.product"), key: "product" },
        { label: "Kategoriya", key: "category" },
        { label: t("products.qty"), key: "qty" },
        { label: `${t("sales.unitPrice")} (so'm)`, key: "priceSom" },
        { label: `${t("sales.unitPrice")} ($)`, key: "priceUsd" },
        { label: `${t("sales.discount")} (so'm)`, key: "discountSom" },
        { label: `${t("common.total")} (so'm)`, key: "totalSom" },
        { label: `${t("common.total")} ($)`, key: "totalUsd" },
        { label: t("sales.payment"), key: "payment" },
      ],
      `Hisobot - ${period.toUpperCase()}`,
      `hisobot_${period}_${formatDate(new Date()).replace(/\//g, "-")}.xls`,
    );
    toast.success(t("reports.excelDownloaded"));
  };

  const actionButtons = (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="px-3 py-1 font-mono text-xs border-primary/30 bg-primary/5 text-primary"
      >
        1 $ = {formatSom(activeRate)}
      </Badge>
      <Button variant="outline" size="sm" onClick={exportExcel}>
        <Download className="h-4 w-4 mr-1.5" />
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)}>
        <FileText className="h-4 w-4 mr-1.5" />
        Chop etish / PDF
      </Button>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {!hideHeader && (
        <PageHeader
          title={t("reports.title")}
          subtitle={t("reports.subtitle")}
          actions={actionButtons}
        />
      )}

      {/* Period Selector & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60">
          {(["today", "week", "month", "all"] as Period[]).map((value) => (
            <Button
              key={value}
              variant={value === period ? "default" : "ghost"}
              size="sm"
              className="text-xs font-semibold h-8"
              onClick={() => {
                setPeriod(value);
                setPage(1);
              }}
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
        {hideHeader && actionButtons}
      </div>

      {/* KPI Cards with Dual Currency */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Jami sotuv"
          value={formatSom(totalSales)}
          subValue={formatUsd(totalSales / activeRate)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label="Sof foyda"
          value={formatSom(totalProfit)}
          subValue={formatUsd(totalProfit / activeRate)}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label="Chegirmalar"
          value={formatSom(totalDiscount)}
          subValue={totalDiscount > 0 ? formatUsd(totalDiscount / activeRate) : undefined}
          icon={Percent}
          accent="warning"
        />
        <StatCard
          label="Xarajatlar"
          value={formatSom(totalExpense)}
          subValue={totalExpense > 0 ? formatUsd(totalExpense / activeRate) : undefined}
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
          subValue={txCount > 0 ? `O'rtacha: ${formatSom(totalSales / txCount)}` : undefined}
          icon={ShoppingCart}
          accent="primary"
        />
      </div>

      {/* Payment breakdown */}
      {paymentBreakdown.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {paymentBreakdown.map(({ type, count, total }) => (
            <Card key={type} className="rounded-xl border-border/60">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase">
                      {paymentLabel(t, type)}
                    </div>
                    <div className="text-base font-bold mt-0.5">{formatSom(total)}</div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {formatUsd(total / activeRate)}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {count} ta
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sold products breakdown table with № */}
      <Card className="rounded-2xl card-elevated border-border/60 overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Sotilgan tovarlar tahlili
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Jami {productBreakdown.length} xil mahsulot
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 backdrop-blur sticky top-0 z-10 text-xs text-muted-foreground uppercase border-b border-border/60">
                <tr>
                  <th className="p-3 w-12 text-center">№</th>
                  <th className="p-3">Tovar</th>
                  <th className="p-3 text-center">Soni</th>
                  <th className="p-3 text-right">Sotuv summasi</th>
                  <th className="p-3 text-right">Sof foyda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {productBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Ma'lumotlar yo'q
                    </td>
                  </tr>
                ) : (
                  productBreakdown.map((product, idx) => (
                    <tr key={product.productId} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-center text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-medium text-xs">
                        <div>{product.name}</div>
                        {product.vehicle && (
                          <div className="text-[10px] text-muted-foreground">{product.vehicle}</div>
                        )}
                      </td>
                      <td className="p-3 text-center tabular-nums font-semibold text-xs">
                        {product.totalQty}
                      </td>
                      <td className="p-3 text-right tabular-nums text-xs font-medium">
                        <div>{formatSom(product.totalRevenue)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatUsd(product.totalRevenue / activeRate)}
                        </div>
                      </td>
                      <td className="p-3 text-right text-xs tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        <div>+{formatSom(product.totalProfit)}</div>
                        <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-normal">
                          +{formatUsd(product.totalProfit / activeRate)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sales list table with pagination (50 per page) and № */}
      <Card className="rounded-2xl card-elevated border-border/60 overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Sotuvlar ro'yxati
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Jami {filteredSales.length} ta sotuv
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 backdrop-blur sticky top-0 z-10 text-xs text-muted-foreground uppercase border-b border-border/60">
                <tr>
                  <th className="p-3 w-12 text-center">№</th>
                  <th className="p-3">Sana va vaqt</th>
                  <th className="p-3">Mijoz</th>
                  <th className="p-3 text-center">To'lov</th>
                  <th className="p-3 text-right">Chegirma</th>
                  <th className="p-3 text-right">Umumiy summa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Bu davr uchun sotuvlar yo'q
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale, idx) => {
                    const rowNumber = (page - 1) * pageSize + idx + 1;
                    const customer = customers.find((c) => c.id === sale.customerId);
                    return (
                      <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-center text-xs text-muted-foreground font-mono">
                          {rowNumber}
                        </td>
                        <td className="p-3 text-xs whitespace-nowrap text-muted-foreground font-mono">
                          {formatDateTime(sale.date)}
                        </td>
                        <td className="p-3">
                          <div className="text-xs font-medium">
                            {customer?.name || t("sales.generalCustomer")}
                          </div>
                          {customer?.phone && (
                            <div className="text-[10px] text-muted-foreground">
                              {customer.phone}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={sale.paymentType === "Qarz" ? "destructive" : "secondary"}
                            className="text-[11px] font-medium"
                          >
                            {paymentLabel(t, sale.paymentType)}
                          </Badge>
                        </td>
                        <td className="p-3 text-right text-xs tabular-nums">
                          {sale.discount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              -{formatSom(sale.discount)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-right font-semibold text-xs tabular-nums">
                          <div>{formatSom(sale.total)}</div>
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {formatUsd(sale.total / activeRate)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </CardContent>
      </Card>

      {/* Print dialog */}
      <ReportsPrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        period={period}
        totalSales={totalSales}
        totalDiscount={totalDiscount}
        totalProfit={totalProfit}
        productBreakdown={productBreakdown}
        filteredSales={filteredSales}
        filteredExpenses={filteredExpenses}
        customers={customers}
        usdRate={activeRate}
        t={t}
      />
    </div>
  );
}
