import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Download,
  ArrowLeft,
  Wallet,
  TrendingUp,
  Percent,
  ShoppingCart,
  Search,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader, StatCard, exportToExcel } from "@/components/ui-kit";
import { formatSom, formatUsd, formatPriceBoth, formatDate, formatDateTime } from "@/lib/constants";
import { paymentLabel } from "@/lib/i18n/helpers";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

const UZ_MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentyabr",
  "Oktyabr",
  "Noyabr",
  "Dekabr",
];

export const Route = createFileRoute("/_app/report-day/$date")({ component: ReportDayPage });

function ReportDayPage() {
  const t = useT();
  const navigate = useNavigate();
  const { date } = Route.useParams();
  const { sales, products, customers, usdRate } = useStore();
  const activeRate = usdRate > 0 ? usdRate : 12835;

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const daySales = useMemo(() => {
    return sales
      .filter((sale) => {
        const saleDate = new Date(sale.date);
        return (
          saleDate.getFullYear() === year &&
          saleDate.getMonth() + 1 === month &&
          saleDate.getDate() === day
        );
      })
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  }, [sales, year, month, day]);

  const total = daySales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProfit = daySales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const totalDiscount = daySales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
  const txCount = daySales.length;

  const totalUsd = Number((total / activeRate).toFixed(2));
  const profitUsd = Number((totalProfit / activeRate).toFixed(2));

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    return Array.from(
      daySales.reduce((map, sale) => {
        const entry = map.get(sale.paymentType) || { count: 0, total: 0 };
        entry.count += 1;
        entry.total += sale.total;
        map.set(sale.paymentType, entry);
        return map;
      }, new Map<string, { count: number; total: number }>()),
    ).map(([type, data]) => ({ type, ...data }));
  }, [daySales]);

  // Filtered sales for table display
  const filteredSales = useMemo(() => {
    return daySales.filter((sale) => {
      if (paymentFilter !== "all" && sale.paymentType !== paymentFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const customer = customers.find((c) => c.id === sale.customerId);
      const customerMatch =
        customer?.name?.toLowerCase().includes(q) || customer?.phone?.includes(q);
      const itemMatch = sale.items.some((item) => {
        const p = products.find((prod) => prod.id === item.productId);
        const name = (p?.name || item.productName || "").toLowerCase();
        return name.includes(q);
      });
      return customerMatch || itemMatch;
    });
  }, [daySales, paymentFilter, search, customers, products]);

  // Flattened items for sequential numbered rows
  const flattenedRows = useMemo(() => {
    let rowNum = 1;
    return filteredSales.flatMap((sale) => {
      const customer = customers.find((item) => item.id === sale.customerId);
      return sale.items.map((item, itemIdx) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          rowNumber: rowNum++,
          sale,
          item,
          isFirstItem: itemIdx === 0,
          customer,
          product,
        };
      });
    });
  }, [filteredSales, customers, products]);

  const monthName = UZ_MONTHS[month - 1] || monthStr;
  const dayLabel = `${day}-${monthName} ${year}-yil`;

  const exportDay = () => {
    let exportNum = 1;
    const rows = daySales.flatMap((sale) => {
      const customer = customers.find((item) => item.id === sale.customerId);
      return sale.items.map((item, index) => {
        const product = products.find((p) => p.id === item.productId);
        const somPrice = item.price;
        const usdPrice = product?.sellPriceUsd || Number((somPrice / activeRate).toFixed(2));
        const somTotal = index === 0 ? sale.total : 0;
        const usdTotal = somTotal > 0 ? Number((somTotal / activeRate).toFixed(2)) : 0;

        return {
          number: exportNum++,
          time: new Date(sale.date).toLocaleTimeString("uz-UZ", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: formatDate(sale.date),
          customer: customer?.name || t("sales.generalCustomer"),
          phone: customer?.phone || "",
          product: product?.name || item.productName || t("sales.unknownProduct"),
          quantity: item.qty,
          priceSom: somPrice,
          priceUsd: usdPrice,
          discountSom: index === 0 ? sale.discount : 0,
          totalSom: somTotal,
          totalUsd: usdTotal,
          payment: paymentLabel(t, sale.paymentType),
        };
      });
    });

    exportToExcel(
      rows,
      [
        { label: "№", key: "number" },
        { label: t("reports.time"), key: "time" },
        { label: t("reports.date"), key: "date" },
        { label: t("sales.customer"), key: "customer" },
        { label: t("common.phone"), key: "phone" },
        { label: t("common.product"), key: "product" },
        { label: t("products.qty"), key: "quantity" },
        { label: `${t("sales.unitPrice")} (so'm)`, key: "priceSom" },
        { label: `${t("sales.unitPrice")} ($)`, key: "priceUsd" },
        { label: `${t("sales.discount")} (so'm)`, key: "discountSom" },
        { label: `${t("common.total")} (so'm)`, key: "totalSom" },
        { label: `${t("common.total")} ($)`, key: "totalUsd" },
        { label: t("sales.payment"), key: "payment" },
      ],
      `Kunlik Hisobot - ${dayLabel}`,
      `kunlik_${date}.xls`,
    );
    toast.success(t("reports.excelDownloaded"));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title={dayLabel}
        subtitle={t("reports.daySummary", { count: daySales.length })}
        onBack={() => navigate({ to: "/reports" })}
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="px-3 py-1 font-mono text-xs border-primary/30 bg-primary/5 text-primary"
            >
              1 $ = {formatSom(activeRate)}
            </Badge>
            <Button onClick={exportDay} disabled={!daySales.length} size="sm">
              <Download className="mr-1.5 h-4 w-4" /> Excel hisobot
            </Button>
          </div>
        }
      />

      {/* KPI Cards with Dual Currency */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Kunlik sotuv"
          value={formatSom(total)}
          subValue={formatUsd(totalUsd)}
          icon={Wallet}
          accent="primary"
        />
        <StatCard
          label="Sof foyda"
          value={formatSom(totalProfit)}
          subValue={formatUsd(profitUsd)}
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
          label="Tranzaksiyalar"
          value={`${txCount} ta`}
          subValue={
            daySales.length > 0 ? `O'rtacha: ${formatSom(total / daySales.length)}` : undefined
          }
          icon={ShoppingCart}
          accent="info"
        />
      </div>

      {/* Payment breakdown */}
      {paymentBreakdown.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {paymentBreakdown.map(({ type, count, total: pTotal }) => (
            <Card key={type} className="rounded-xl border-border/60">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase">
                      {paymentLabel(t, type)}
                    </div>
                    <div className="text-base font-bold mt-0.5">{formatSom(pTotal)}</div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {formatUsd(pTotal / activeRate)}
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

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mijoz yoki tovar bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["all", "Naqd", "Karta", "Qarz", "O'tkazma"].map((type) => (
            <Button
              key={type}
              variant={paymentFilter === type ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={() => setPaymentFilter(type)}
            >
              {type === "all" ? "Barchasi" : paymentLabel(t, type)}
            </Button>
          ))}
        </div>
      </div>

      {/* Sales details table */}
      <Card className="rounded-2xl card-elevated border-border/60 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/70 backdrop-blur sticky top-0 z-10 text-xs text-muted-foreground uppercase border-b border-border/60">
                <tr>
                  <th className="p-3 w-12 text-center">№</th>
                  <th className="p-3">{t("reports.time")}</th>
                  <th className="p-3">{t("sales.customer")}</th>
                  <th className="p-3">{t("common.product")}</th>
                  <th className="p-3 text-center">{t("products.qty")}</th>
                  <th className="p-3 text-right">{t("sales.unitPrice")}</th>
                  <th className="p-3 text-right">{t("sales.discount")}</th>
                  <th className="p-3 text-right">{t("common.total")}</th>
                  <th className="p-3 text-center">{t("sales.payment")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {flattenedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      {daySales.length === 0
                        ? t("reports.noSalesDay")
                        : "Mos keluvchi sotuvlar topilmadi"}
                    </td>
                  </tr>
                ) : (
                  flattenedRows.map(({ rowNumber, sale, item, isFirstItem, customer, product }) => {
                    return (
                      <tr
                        key={`${sale.id}-${item.productId}-${rowNumber}`}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 text-center text-xs text-muted-foreground font-mono">
                          {rowNumber}
                        </td>
                        <td className="whitespace-nowrap p-3 text-xs text-muted-foreground font-mono">
                          {new Date(sale.date).toLocaleTimeString("uz-UZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-xs">
                            {customer?.name || t("sales.generalCustomer")}
                          </div>
                          {customer?.phone && (
                            <div className="text-[11px] text-muted-foreground">
                              {customer.phone}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-xs">
                            {product?.name || item.productName || t("sales.unknownProduct")}
                          </div>
                          {product?.category && (
                            <div className="text-[10px] text-muted-foreground">
                              {product.category}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center tabular-nums font-semibold text-xs">
                          {item.qty}
                        </td>
                        <td className="whitespace-nowrap p-3 text-right tabular-nums text-xs">
                          <div>{formatSom(item.price)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatUsd(
                              product?.sellPriceUsd || Number((item.price / activeRate).toFixed(2)),
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap p-3 text-right tabular-nums text-xs">
                          {isFirstItem && sale.discount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              -{formatSom(sale.discount)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="whitespace-nowrap p-3 text-right font-semibold tabular-nums text-xs">
                          {isFirstItem ? (
                            <div>
                              <div>{formatSom(sale.total)}</div>
                              <div className="text-[10px] text-muted-foreground font-normal">
                                {formatUsd(sale.total / activeRate)}
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isFirstItem && (
                            <Badge
                              variant={sale.paymentType === "Qarz" ? "destructive" : "secondary"}
                              className="text-[11px] font-medium"
                            >
                              {paymentLabel(t, sale.paymentType)}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
