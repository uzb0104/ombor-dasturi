import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSom } from "@/lib/constants";

interface DashboardHeroBannerProps {
  netProfit: number;
  totalProfit: number;
  totalExpenses: number;
  monthSales: number;
  totalDebt: number;
  lang: string;
}

export function DashboardHeroBanner({
  netProfit,
  totalProfit,
  totalExpenses,
  monthSales,
  totalDebt,
  lang,
}: DashboardHeroBannerProps) {
  return (
    <Card className="p-6 rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 shadow-sm relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant={netProfit >= 0 ? "default" : "destructive"}
              className="text-xs px-2.5 py-0.5 font-semibold"
            >
              {netProfit >= 0
                ? lang === "ru"
                  ? "ЧИСТАЯ ПРИБЫЛЬ"
                  : "SOF FOYDA (Sof Daromad)"
                : lang === "ru"
                  ? "ЧИСТЫЙ УБЫТОК"
                  : "SOF ZIYON (Manfiy)"}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              {lang === "ru" ? "Финансовый баланс" : "Aniq Moliyaviy Balans"}
            </span>
          </div>
          <div className="text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
            {formatSom(netProfit)}
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === "ru" ? "Формула: Валовая прибыль" : "Formula: Sotuv Yalpi Foydasi"} (
            {formatSom(totalProfit)}) − {lang === "ru" ? "Все расходы" : "Jami Chiqimlar"} (
            {formatSom(totalExpenses)}) ={" "}
            <strong className="text-foreground font-semibold">{formatSom(netProfit)}</strong>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-xl border">
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {lang === "ru" ? "Выручка продаж" : "Jami Sotuv Tushumi"}
            </div>
            <div className="text-sm font-bold tabular-nums">{formatSom(monthSales)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {lang === "ru" ? "Валовая прибыль" : "Sotuv Yalpi Foydasi"}
            </div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatSom(totalProfit)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {lang === "ru" ? "Все расходы" : "Jami Chiqimlar"}
            </div>
            <div className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              −{formatSom(totalExpenses)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {lang === "ru" ? "Общая задолженность" : "Jami Qarzdorlik"}
            </div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {formatSom(totalDebt)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
