import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ChevronDown, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { exportToExcel, PageHeader } from "@/components/ui-kit";
import { formatSom } from "@/lib/constants";
import { paymentLabel } from "@/lib/i18n/helpers";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Sale } from "@/lib/types";
import { toast } from "sonner";

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const MONTH_NAMES_UZ = [
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

const WEEKDAYS_UZ = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Yak"];

export function ReportsCalendarPage() {
  const t = useT();
  const navigate = useNavigate();
  const { sales, products, customers } = useStore();
  const today = new Date();

  const [monthDate, setMonthDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => dayKey(today));
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const [pickerYear, setPickerYear] = useState<number>(year);

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

  // Year range from 2024 to 2035
  const years = Array.from({ length: 2035 - 2024 + 1 }, (_, index) => 2024 + index);
  const monthDays = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const days: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: monthDays }, (_, index) => index + 1),
  ];
  const weekdays = WEEKDAYS_UZ;
  const monthLabel = MONTH_NAMES_UZ[month];

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
    exportReport(
      monthSales,
      `${monthLabel} ${year}`,
      `oylik_${year}-${String(month + 1).padStart(2, "0")}.xls`,
    );
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium text-xs h-9"
              onClick={exportMonth}
              disabled={!monthSales.length}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Oylik Excel hisobot ({monthLabel})
            </Button>
            <Button
              variant="outline"
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-medium text-xs h-9"
              onClick={exportYear}
              disabled={!yearSales.length}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Yillik Excel hisobot ({year})
            </Button>
          </div>
        }
      />
      <div>
        <Card className="rounded-2xl card-elevated border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => moveMonth(-1)}
                aria-label={t("reports.previousMonth")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Month Picker Popover Grid */}
              <Popover
                open={monthPickerOpen}
                onOpenChange={(v) => {
                  setMonthPickerOpen(v);
                  if (v) setPickerYear(year);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="font-bold text-base px-4 h-9 flex items-center gap-2 hover:bg-accent cursor-pointer min-w-44 justify-center"
                  >
                    <span>
                      {monthLabel} {year}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 space-y-4" align="start">
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="font-semibold text-sm">Oyni tanlang</span>
                    <Select
                      value={String(pickerYear)}
                      onValueChange={(value) => setPickerYear(Number(value))}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs font-semibold">
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
                  </div>

                  {/* 3 Columns Grid for 12 months */}
                  <div className="grid grid-cols-3 gap-2">
                    {MONTH_NAMES_UZ.map((name, idx) => {
                      const isSelected = year === pickerYear && month === idx;
                      const isCurrent =
                        today.getFullYear() === pickerYear && today.getMonth() === idx;

                      return (
                        <Button
                          key={name}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className={`h-10 text-xs font-medium transition-all ${
                            isSelected ? "font-bold shadow-xs" : ""
                          } ${
                            isCurrent && !isSelected
                              ? "border-primary text-primary font-semibold"
                              : ""
                          }`}
                          onClick={() => {
                            const next = new Date(pickerYear, idx, 1);
                            setMonthDate(next);
                            setSelectedDate(dayKey(next));
                            setMonthPickerOpen(false);
                          }}
                        >
                          {name}
                        </Button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="icon"
                onClick={() => moveMonth(1)}
                aria-label={t("reports.nextMonth")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1.5">
              {weekdays.map((weekday) => (
                <div
                  key={weekday}
                  className="py-2 text-center text-xs text-muted-foreground font-semibold"
                >
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
                    className={`flex min-h-20 min-w-0 flex-col rounded-lg border p-2 text-left hover:border-primary/60 transition-all ${selectedDate === key ? "border-primary bg-primary/10" : "border-border/60"}`}
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
