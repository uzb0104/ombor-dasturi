import React, { useMemo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { formatSom, formatUsd } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Product, IncomingStock } from "@/lib/types";

export interface ComparisonRowData {
  product: Product | undefined;
  productId: string;
  items?: IncomingStock[];
  vehicle?: string;
  totalQty?: number;
  regionsCount: number;
  regionPrices: Record<
    string,
    {
      price: number;
      priceUsd?: number;
      currency?: "UZS" | "USD";
      date: string;
      supplierName?: string;
      qty: number;
      invoice?: string;
    }
  >;
  minPrice: number;
  maxPrice: number;
  priceDiff: number;
  diffPercent: number;
  cheapestRegions: string[];
  expensiveRegions: string[];
}

interface PriceComparisonRowProps {
  index: number;
  row: ComparisonRowData;
  activeRegions: string[];
  usdRate: number;
  isRu: boolean;
  onSelectProductForHistory: (product: Product) => void;
}

export function PriceComparisonRow({
  index,
  row,
  activeRegions,
  usdRate,
  isRu,
  onSelectProductForHistory,
}: PriceComparisonRowProps) {
  const p = row.product;
  const hasMulti = row.regionsCount >= 2;

  // Rank all regions that have a price for this product from lowest to highest
  const rankedRegions = useMemo(() => {
    return Object.entries(row.regionPrices)
      .map(([reg, data]) => {
        const usd = data.priceUsd || (usdRate > 0 ? Number((data.price / usdRate).toFixed(2)) : 0);
        return {
          region: reg,
          price: data.price,
          usd,
          currency: data.currency,
          date: data.date,
        };
      })
      .sort((a, b) => a.price - b.price);
  }, [row.regionPrices, usdRate]);

  const cheapestUsd = usdRate > 0 ? Number((row.minPrice / usdRate).toFixed(2)) : 0;
  const maxDiffUsd = usdRate > 0 ? Number((row.priceDiff / usdRate).toFixed(2)) : 0;

  return (
    <TableRow className={cn("hover:bg-muted/40", hasMulti && "bg-emerald-500/[0.02]")}>
      {/* 0. Tartib raqami (№) */}
      <TableCell className="text-center font-mono text-xs text-muted-foreground font-semibold w-12 align-middle">
        {index + 1}
      </TableCell>

      {/* 1. Tovar nomi & Mashina modeli */}
      <TableCell className="align-middle min-w-[180px] max-w-[230px]">
        <div className="font-semibold text-sm text-foreground truncate" title={p?.name}>
          {p?.name || "Noma'lum tovar"}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
            🚗 {row.vehicle || p?.vehicle || "Universal"}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {isRu ? "Остаток:" : "Qoldiq:"} {p?.quantity ?? 0}
          </span>
        </div>
      </TableCell>

      {/* 2. Hududlar soni */}
      <TableCell className="text-center align-middle min-w-[90px]">
        {hasMulti ? (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] px-2 py-0.5 font-semibold">
            {row.regionsCount} {isRu ? "обл." : "viloyat"}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[11px] px-2 py-0.5">
            1 {isRu ? "обл." : "viloyat"}
          </Badge>
        )}
      </TableCell>

      {/* 3. Har bir viloyat bo'yicha narx ustunlari */}
      {activeRegions.map((reg) => {
        const data = row.regionPrices[reg];
        if (!data) {
          return (
            <TableCell
              key={reg}
              className="text-center text-muted-foreground/40 text-xs align-middle min-w-[120px]"
            >
              —
            </TableCell>
          );
        }

        const isCheapest = hasMulti && data.price === row.minPrice;
        const isMostExpensive = hasMulti && data.price === row.maxPrice && row.priceDiff > 0;
        const isMiddle = hasMulti && !isCheapest && !isMostExpensive;

        const regUsd =
          data.priceUsd || (usdRate > 0 ? Number((data.price / usdRate).toFixed(2)) : 0);
        const diffFromCheapestUsd = Math.max(0, regUsd - cheapestUsd);

        return (
          <TableCell key={reg} className="text-center align-middle p-1.5 min-w-[120px]">
            <div
              className={cn(
                "p-1.5 rounded-xl border text-center transition",
                isCheapest
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold"
                  : isMostExpensive
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400 font-semibold"
                    : isMiddle
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 font-medium"
                      : "bg-muted/20 border-border/50 text-foreground font-medium",
              )}
            >
              <div className="text-xs tabular-nums font-bold">{formatUsd(regUsd)}</div>
              <div className="text-[10px] text-muted-foreground tabular-nums">
                ({formatSom(data.price)})
              </div>
              <div className="text-[10px] flex items-center justify-center gap-1 mt-0.5">
                {isCheapest && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    🟢 {isRu ? "Дешевле" : "Eng arzon"}
                  </span>
                )}
                {isMiddle && (
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    🟡 {isRu ? "Средняя" : "O'rtacha"} (+{formatUsd(diffFromCheapestUsd)})
                  </span>
                )}
                {isMostExpensive && (
                  <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                    🔴 {isRu ? "Дороже" : "Eng qimmat"} (+{formatUsd(diffFromCheapestUsd)})
                  </span>
                )}
              </div>
            </div>
          </TableCell>
        );
      })}

      {/* 4. Narx farqi (Price difference) */}
      <TableCell className="text-center align-middle min-w-[110px]">
        {hasMulti && row.priceDiff > 0 ? (
          <div className="space-y-0.5">
            <span className="font-bold text-rose-600 dark:text-rose-400 text-xs tabular-nums block">
              +{formatUsd(maxDiffUsd)}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums block">
              (+{formatSom(row.priceDiff)})
            </span>
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400 font-medium"
            >
              {row.diffPercent}% {isRu ? "разница" : "farq"}
            </Badge>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground font-medium">
            {hasMulti ? (isRu ? "Одинаково" : "Bir xil") : isRu ? "1 регион" : "1 ta hudud"}
          </span>
        )}
      </TableCell>

      {/* 5. Tavsiya (Recommendation insight comparing ALL regions) */}
      <TableCell className="text-center align-middle min-w-[210px] max-w-[280px]">
        {hasMulti && row.priceDiff > 0 ? (
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 text-[11px] leading-tight text-left space-y-1">
            <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span>🏆</span>
              <span>
                {isRu ? "Выгоднее всего:" : "Eng arzon:"}{" "}
                <strong>{row.cheapestRegions.join(", ")}</strong> ({formatUsd(cheapestUsd)})
              </span>
            </div>
            {/* Show savings relative to every higher-priced region */}
            <div className="text-[10px] text-muted-foreground dark:text-emerald-300/80 space-y-0.5">
              {rankedRegions
                .filter((r) => r.price > row.minPrice)
                .map((r) => {
                  const diff = r.price - row.minPrice;
                  const diffUsd = usdRate > 0 ? Number((diff / usdRate).toFixed(2)) : 0;
                  return (
                    <div key={r.region} className="truncate">
                      • {r.region}:{" "}
                      <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                        {formatUsd(diffUsd)} ({formatSom(diff)})
                      </span>{" "}
                      {isRu ? "дешевле" : "arzon"}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {isRu
              ? "Сравнение появится при приходе из других областей"
              : "Boshqa viloyatlardan kirim bo'lganda tahlil chiqadi"}
          </span>
        )}
      </TableCell>

      {/* 6. Detail action */}
      <TableCell className="text-right pr-4 align-middle min-w-[80px]">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs hover:bg-primary hover:text-primary-foreground"
          onClick={() => {
            if (p) onSelectProductForHistory(p);
          }}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          {isRu ? "История" : "Tarixi"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
