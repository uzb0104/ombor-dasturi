import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSom } from "@/lib/constants";
import { Link } from "@tanstack/react-router";
import {
  ShoppingCart,
  PackagePlus,
  Package,
  Wallet,
  DollarSign,
  TrendingUp,
  Store,
  Layers,
} from "lucide-react";

interface DashboardHeroBannerProps {
  todaySales: number;
  todaySalesCount: number;
  todayProfit: number;
  monthSales: number;
  netProfit: number;
  warehouseValue: number;
  totalProductsCount: number;
  totalItemsQty: number;
  customerDebt: number;
  debtCustomersCount: number;
  usdRate: number;
  usdRateMode: "manual" | "cbu";
  lang: string;
}

export function DashboardHeroBanner({
  todaySales,
  todaySalesCount,
  todayProfit,
  monthSales,
  netProfit,
  warehouseValue,
  totalProductsCount,
  totalItemsQty,
  customerDebt,
  debtCustomersCount,
  usdRate,
  usdRateMode,
  lang,
}: DashboardHeroBannerProps) {
  const isUz = lang !== "ru";

  return (
    <Card className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border border-primary/20 shadow-sm relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Side: Summary & Quick Actions */}
        <div className="space-y-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 text-xs px-2.5 py-0.5 font-semibold flex items-center gap-1"
            >
              <Store className="h-3.5 w-3.5" />
              {isUz ? "OMBOR VA SAVDO TIZIMI" : "СКЛАД И ПРОДАЖИ"}
            </Badge>

            <Badge
              variant="secondary"
              className="text-xs px-2.5 py-0.5 font-medium flex items-center gap-1 bg-muted/60"
            >
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />1 USD ={" "}
              {formatSom(usdRate || 12835)}
              <span className="text-[10px] text-muted-foreground ml-0.5">
                (
                {usdRateMode === "manual"
                  ? isUz
                    ? "Qo'lda"
                    : "Вручную"
                  : isUz
                    ? "MB kursi"
                    : "Курс ЦБ"}
                )
              </span>
            </Badge>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {isUz ? "Bugungi savdo tushumi" : "Выручка продаж сегодня"}
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-foreground mt-0.5">
              {formatSom(todaySales)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
              <span>
                {todaySalesCount} {isUz ? "ta chek / tranzaksiya" : "чеков / сделок"}
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {isUz ? "Sof foyda:" : "Чистая прибыль:"} +{formatSom(todayProfit)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" className="h-9 px-3.5 gap-1.5 shadow-sm">
              <Link to="/sales">
                <ShoppingCart className="h-4 w-4" />
                {isUz ? "Yangi sotuv" : "Новая продажа"}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 px-3.5 gap-1.5">
              <Link to="/incoming">
                <PackagePlus className="h-4 w-4 text-primary" />
                {isUz ? "Kirim qilish" : "Поступление"}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 px-3.5 gap-1.5">
              <Link to="/products">
                <Package className="h-4 w-4 text-muted-foreground" />
                {isUz ? "Tovarlar" : "Товары"}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-9 px-3.5 gap-1.5">
              <Link to="/debts">
                <Wallet className="h-4 w-4 text-amber-500" />
                {isUz ? "Nasiyalar" : "Долги"}
              </Link>
            </Button>
          </div>
        </div>

        {/* Right Side: Key Metrics Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/40 p-4 rounded-xl border border-border/60">
          {/* Ombor */}
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              {isUz ? "Ombor zaxirasi qiymati" : "Стоимость склада"}
            </div>
            <div className="text-base font-bold tabular-nums text-foreground">
              {formatSom(warehouseValue)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {totalProductsCount} {isUz ? "xil" : "видов"} • {totalItemsQty}{" "}
              {isUz ? "dona" : "шт."}
            </div>
          </div>

          {/* Oylik aylanma */}
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              {isUz ? "Oylik tushum" : "Продажи за месяц"}
            </div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatSom(monthSales)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {isUz ? "Foyda:" : "Прибыль:"} +{formatSom(netProfit)}
            </div>
          </div>

          {/* Nasiya */}
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-amber-500" />
              {isUz ? "Mijozlar qarzi" : "Долг клиентов"}
            </div>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {formatSom(customerDebt)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {debtCustomersCount} {isUz ? "ta mijoz qarzdor" : "клиентов с долгом"}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
