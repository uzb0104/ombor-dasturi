import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, ArrowLeft, Wallet, TrendingUp, Percent, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, StatCard, exportToExcel } from "@/components/ui-kit";
import { formatSom } from "@/lib/constants";
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
  const { sales, products, customers } = useStore();

  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const daySales = sales
    .filter((sale) => {
      const saleDate = new Date(sale.date);
      return (
        saleDate.getFullYear() === year &&
        saleDate.getMonth() + 1 === month &&
        saleDate.getDate() === day
      );
    })
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const total = daySales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProfit = daySales.reduce((sum, sale) => sum + (sale.profit || 0), 0);
  const totalDiscount = daySales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
  const txCount = daySales.length;

  const paymentBreakdown = Array.from(
    daySales.reduce((map, sale) => {
      const entry = map.get(sale.paymentType) || { count: 0, total: 0 };
      entry.count += 1;
      entry.total += sale.total;
      map.set(sale.paymentType, entry);
      return map;
    }, new Map<string, { count: number; total: number }>()),
  ).map(([type, data]) => ({ type, ...data }));

  const monthName = UZ_MONTHS[month - 1] || monthStr;
  const dayLabel = `${day}-${monthName} ${year}-yil`;

  const exportDay = () => {
    const rows = daySales.flatMap((sale) => {
      const customer = customers.find((item) => item.id === sale.customerId);
      return sale.items.map((item, index) => ({
        time: new Date(sale.date).toLocaleTimeString("uz-UZ"),
        customer: customer?.name || t("sales.generalCustomer"),
        phone: customer?.phone || "",
        product:
          products.find((product) => product.id === item.productId)?.name ||
          item.productName ||
          t("sales.unknownProduct"),
        quantity: item.qty,
        price: item.price,
        discount: index === 0 ? sale.discount : 0,
        total: index === 0 ? sale.total : 0,
        payment: paymentLabel(t, sale.paymentType),
      }));
    });

    exportToExcel(
      rows,
      [
        { label: t("reports.time"), key: "time" },
        { label: t("sales.customer"), key: "customer" },
        { label: t("common.phone"), key: "phone" },
        { label: t("common.product"), key: "product" },
        { label: t("products.qty"), key: "quantity" },
        { label: t("sales.unitPrice"), key: "price" },
        { label: t("sales.discount"), key: "discount" },
        { label: t("common.total"), key: "total" },
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
          <>
            <Button onClick={exportDay} disabled={!daySales.length}>
              <Download className="mr-1 h-4 w-4" /> Excel
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Kunlik sotuv" value={formatSom(total)} icon={Wallet} accent="primary" />
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
          label="Tranzaksiyalar"
          value={`${txCount} ta`}
          icon={ShoppingCart}
          accent="info"
        />
      </div>

      {paymentBreakdown.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {paymentBreakdown.map(({ type, count, total: pTotal }) => (
            <Card key={type} className="rounded-xl border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase">
                      {paymentLabel(t, type)}
                    </div>
                    <div className="text-lg font-bold mt-0.5">{formatSom(pTotal)}</div>
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">{t("reports.time")}</th>
                  <th className="p-3">{t("sales.customer")}</th>
                  <th className="p-3">{t("common.product")}</th>
                  <th className="p-3 text-right">{t("products.qty")}</th>
                  <th className="p-3 text-right">{t("sales.unitPrice")}</th>
                  <th className="p-3 text-right">{t("sales.discount")}</th>
                  <th className="p-3 text-right">{t("common.total")}</th>
                  <th className="p-3">{t("sales.payment")}</th>
                </tr>
              </thead>
              <tbody>
                {daySales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      {t("reports.noSalesDay")}
                    </td>
                  </tr>
                ) : (
                  daySales.map((sale) => {
                    const customer = customers.find((item) => item.id === sale.customerId);
                    return sale.items.map((item, index) => (
                      <tr
                        key={`${sale.id}-${item.productId}-${index}`}
                        className="border-t border-border/60 hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap p-3">
                          {new Date(sale.date).toLocaleTimeString("uz-UZ", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3">
                          <div>{customer?.name || t("sales.generalCustomer")}</div>
                          {customer?.phone && (
                            <div className="text-xs text-muted-foreground">{customer.phone}</div>
                          )}
                        </td>
                        <td className="p-3 font-medium">
                          {products.find((product) => product.id === item.productId)?.name ||
                            item.productName ||
                            t("sales.unknownProduct")}
                        </td>
                        <td className="p-3 text-right tabular-nums font-semibold">{item.qty}</td>
                        <td className="whitespace-nowrap p-3 text-right tabular-nums">
                          {formatSom(item.price)}
                        </td>
                        <td className="whitespace-nowrap p-3 text-right tabular-nums">
                          {index === 0 ? formatSom(sale.discount) : "—"}
                        </td>
                        <td className="whitespace-nowrap p-3 text-right font-semibold tabular-nums">
                          {index === 0 ? formatSom(sale.total) : "—"}
                        </td>
                        <td className="p-3">
                          {index === 0 && (
                            <Badge
                              variant={sale.paymentType === "Qarz" ? "destructive" : "secondary"}
                            >
                              {paymentLabel(t, sale.paymentType)}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ));
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
