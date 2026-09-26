import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportToExcel, PageHeader } from "@/components/ui-kit";
import { formatSom } from "@/lib/constants";
import { paymentLabel } from "@/lib/i18n/helpers";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Sale } from "@/lib/types";
import { toast } from "sonner";

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function ReportsCalendarPage() {
  const t = useT();
  const navigate = useNavigate();
  const { sales, products, customers } = useStore();
  const today = new Date();
  const [monthDate, setMonthDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => dayKey(today));
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthSales = useMemo(
    () =>
      sales
        .filter((sale) => {
          const date = new Date(sale.date);
          return date.getFullYear() === year && date.getMonth() === month;
        })
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [month, sales, year],
  );
  const yearSales = useMemo(
    () => sales.filter((sale) => new Date(sale.date).getFullYear() === year),
    [sales, year],
  );
  const salesByDay = useMemo(() => {
    const map = new Map<string, Sale[]>();
    monthSales.forEach((sale) => {
      const key = dayKey(new Date(sale.date));
      map.set(key, [...(map.get(key) || []), sale]);
    });
    return map;
  }, [monthSales]);
  const allYears = sales.map((sale) => new Date(sale.date).getFullYear()).filter(Number.isFinite);
  const firstYear = Math.min(new Date().getFullYear() - 5, year, ...allYears);
  const lastYear = Math.max(new Date().getFullYear() + 1, year);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  const monthDays = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const days: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: monthDays }, (_, index) => index + 1),
  ];
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat("uz-UZ", { weekday: "short" }).format(new Date(2024, 0, index + 1)),
  );
  const monthLabel = monthDate.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" });
  const exportReport = (rows: Sale[], title: string, filename: string) => {
    const data = rows.flatMap((sale) => {
      const customer = customers.find((item) => item.id === sale.customerId);
      return sale.items.map((item, index) => ({
        date: new Date(sale.date).toLocaleString("uz-UZ"),
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
      data,
      [
        { label: t("reports.date"), key: "date" },
        { label: t("sales.customer"), key: "customer" },
        { label: t("common.phone"), key: "phone" },
        { label: t("common.product"), key: "product" },
        { label: t("products.qty"), key: "quantity" },
        { label: t("sales.unitPrice"), key: "price" },
        { label: t("sales.discount"), key: "discount" },
        { label: t("common.total"), key: "total" },
        { label: t("sales.payment"), key: "payment" },
      ],
      title,
      filename,
    );
    toast.success(t("reports.excelDownloaded"));
  };
  const exportMonth = () =>
    exportReport(monthSales, monthLabel, `oylik_${year}-${String(month + 1).padStart(2, "0")}.xls`);
  const exportYear = () => exportReport(yearSales, String(year), `yillik_${year}.xls`);
  const moveMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setMonthDate(next);
    setSelectedDate(dayKey(next));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.calendarSubtitle")}
        actions={
          <>
            <Button variant="outline" onClick={exportMonth} disabled={!monthSales.length}>
              <Download className="mr-1 h-4 w-4" />
              {t("reports.exportMonth")}
            </Button>
            <Button variant="outline" onClick={exportYear} disabled={!yearSales.length}>
              <Download className="mr-1 h-4 w-4" />
              {t("reports.exportYear")}
            </Button>
          </>
        }
      />
      <div>
        <Card className="rounded-2xl card-elevated border-border/60">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => moveMonth(-1)}
                aria-label={t("reports.previousMonth")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="min-w-36 text-center text-base capitalize">
                {monthLabel}
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={() => moveMonth(1)}
                aria-label={t("reports.nextMonth")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={String(year)}
              onValueChange={(value) => {
                const next = new Date(Number(value), month, 1);
                setMonthDate(next);
                setSelectedDate(dayKey(next));
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1.5">
              {weekdays.map((weekday) => (
                <div key={weekday} className="py-2 text-center text-xs text-muted-foreground">
                  {weekday}
                </div>
              ))}
              {days.map((day, index) => {
                if (!day) return <div key={`blank-${index}`} />;
                const key = dayKey(new Date(year, month, day));
                const rows = salesByDay.get(key) || [];
                const amount = rows.reduce((sum, sale) => sum + sale.total, 0);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => navigate({ to: "/report-day/$date", params: { date: key } })}
                    className={`flex min-h-20 min-w-0 flex-col rounded-lg border p-2 text-left hover:border-primary/60 ${selectedDate === key ? "border-primary bg-primary/10" : "border-border/60"}`}
                  >
                    <span className="text-sm font-semibold">{day}</span>
                    {rows.length > 0 && (
                      <>
                        <span className="mt-auto text-[10px] text-muted-foreground">
                          {t("reports.saleCount", { count: rows.length })}
                        </span>
                        <span className="truncate text-[10px] font-semibold text-primary">
                          {formatSom(amount)}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
