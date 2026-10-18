import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, MapPin, Search, X, ArrowUpDown, Plus } from "lucide-react";
import type { IncomingStock, Product, Supplier } from "@/lib/types";
import { PriceComparisonRow } from "./PriceComparisonRow";

interface PriceComparisonTabProps {
  incoming: IncomingStock[];
  products: Product[];
  suppliers?: Supplier[];
  incomingCategories: readonly string[];
  usdRate: number;
  isRu: boolean;
  onOpenNewIncoming: () => void;
  onSelectProductForHistory: (product: Product) => void;
}

export function PriceComparisonTab({
  incoming,
  products,
  incomingCategories,
  usdRate,
  isRu,
  onOpenNewIncoming,
  onSelectProductForHistory,
}: PriceComparisonTabProps) {
  const [compareSearch, setCompareSearch] = useState("");
  const [compareVehicleFilter, setCompareVehicleFilter] = useState("all");
  const [onlyMultiRegion, setOnlyMultiRegion] = useState(false);

  // ── Regional Price Comparison Analytics ──
  const comparisonData = useMemo(() => {
    // Unique regions present in incoming or categories
    const activeRegions = Array.from(
      new Set([
        ...incoming.map((i) => i.region).filter((r): r is string => Boolean(r)),
        ...incomingCategories,
      ]),
    );

    // Group incoming records by productId
    const groupedByProduct: Record<string, IncomingStock[]> = {};
    incoming.forEach((item) => {
      if (!groupedByProduct[item.productId]) {
        groupedByProduct[item.productId] = [];
      }
      groupedByProduct[item.productId].push(item);
    });

    const rows = Object.entries(groupedByProduct).map(([pId, items]) => {
      const product = products.find((p) => p.id === pId);

      // Price per region (using latest purchase price)
      const regionPrices: Record<
        string,
        {
          price: number;
          priceUsd?: number;
          currency?: "UZS" | "USD";
          date: string;
          qty: number;
          invoice?: string;
        }
      > = {};

      items.forEach((item) => {
        const reg = item.region || (isRu ? "Без региона" : "Hududsiz");
        const existing = regionPrices[reg];
        if (!existing || new Date(item.date) > new Date(existing.date)) {
          const usdVal =
            item.buyPriceUsd !== undefined && item.buyPriceUsd > 0
              ? item.buyPriceUsd
              : usdRate > 0 && item.buyPrice > 0
                ? Number((item.buyPrice / usdRate).toFixed(2))
                : 0;
          regionPrices[reg] = {
            price: item.buyPrice,
            priceUsd: usdVal,
            currency: item.currency,
            date: item.date,
            qty: item.qty,
            invoice: item.invoice,
          };
        }
      });

      const validPrices = Object.values(regionPrices).map((r) => r.price);
      const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
      const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
      const priceDiff = maxPrice - minPrice;
      const diffPercent = maxPrice > 0 ? Math.round((priceDiff / maxPrice) * 100) : 0;

      const cheapestRegions = Object.entries(regionPrices)
        .filter(([_, v]) => v.price === minPrice)
        .map(([reg]) => reg);

      const expensiveRegions = Object.entries(regionPrices)
        .filter(([_, v]) => v.price === maxPrice && v.price !== minPrice)
        .map(([reg]) => reg);

      return {
        productId: pId,
        product,
        items,
        regionPrices,
        regionsCount: Object.keys(regionPrices).length,
        minPrice,
        maxPrice,
        priceDiff,
        diffPercent,
        cheapestRegions,
        expensiveRegions,
      };
    });

    // Available car brands/models for filter
    const availableVehicles = Array.from(
      new Set(
        rows
          .map((r) => r.product?.vehicle)
          .filter((v): v is string => Boolean(v))
          .flatMap((v) => v.split(/,\s*/)),
      ),
    ).sort();

    // Filter rows based on search and vehicle
    const filteredRows = rows.filter((row) => {
      if (onlyMultiRegion && row.regionsCount < 2) return false;
      if (compareVehicleFilter !== "all") {
        if (!row.product?.vehicle?.toLowerCase().includes(compareVehicleFilter.toLowerCase())) {
          return false;
        }
      }
      if (compareSearch.trim()) {
        const q = compareSearch.toLowerCase().trim();
        const matchesName = row.product?.name?.toLowerCase().includes(q);
        const matchesVehicle = row.product?.vehicle?.toLowerCase().includes(q);
        const matchesSku = row.product?.sku?.toLowerCase().includes(q);
        if (!matchesName && !matchesVehicle && !matchesSku) return false;
      }
      return true;
    });

    // Sort: multi-region with highest priceDiff first
    filteredRows.sort((a, b) => {
      if (b.regionsCount !== a.regionsCount) return b.regionsCount - a.regionsCount;
      return b.priceDiff - a.priceDiff;
    });

    const multiRegionCount = rows.filter((r) => r.regionsCount >= 2).length;

    return {
      activeRegions,
      rows: filteredRows,
      availableVehicles,
      multiRegionCount,
      comparedCount: rows.length,
    };
  }, [
    incoming,
    products,
    incomingCategories,
    usdRate,
    compareSearch,
    compareVehicleFilter,
    onlyMultiRegion,
    isRu,
  ]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Card className="p-3.5 rounded-2xl bg-card border-border/60 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              {isRu ? "Товары с приходом" : "Kirim qilingan tovarlar"}
            </div>
            <div className="text-2xl font-bold mt-0.5 text-foreground">
              {comparisonData.comparedCount}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {isRu ? "видов" : "xil"}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {comparisonData.multiRegionCount}{" "}
              {isRu ? "в 2+ регионах" : "ta tovar 2+ viloyatda bor"}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
            <Package className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-3.5 rounded-2xl bg-card border-border/60 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              {isRu ? "Активные регионы" : "Faol viloyatlar"}
            </div>
            <div className="text-2xl font-bold mt-0.5 text-foreground">
              {comparisonData.activeRegions.length}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {isRu ? "обл." : "ta"}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[200px]">
              {incomingCategories.join(", ") || (isRu ? "Узбекистан" : "O'zbekiston")}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 grid place-items-center">
            <MapPin className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Sticky Search & Filter Controls */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-1 pb-1">
        <Card className="p-3 rounded-2xl bg-card border-border/60 shadow-xs">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={
                    isRu
                      ? "Поиск товара или модели авто..."
                      : "Tovar yoki moshina modelini qidirish..."
                  }
                  value={compareSearch}
                  onChange={(e) => setCompareSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
                {compareSearch && (
                  <button
                    onClick={() => setCompareSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Car Model Filter */}
              <Select value={compareVehicleFilter} onValueChange={setCompareVehicleFilter}>
                <SelectTrigger className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder={isRu ? "Модель авто" : "Moshina modeli"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isRu ? "Все модели авто" : "Barcha modellar"}
                  </SelectItem>
                  {comparisonData.availableVehicles.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 pl-2">
                <Checkbox
                  id="multi-region-toggle"
                  checked={onlyMultiRegion}
                  onCheckedChange={(v) => setOnlyMultiRegion(!!v)}
                />
                <Label
                  htmlFor="multi-region-toggle"
                  className="text-xs cursor-pointer select-none text-muted-foreground hover:text-foreground"
                >
                  {isRu ? "Только в 2+ регионах" : "Faqat 2+ viloyatda bor tovarlar"}
                </Label>
              </div>
            </div>

            <div className="text-xs text-muted-foreground shrink-0 self-center">
              {isRu ? "Найдено:" : "Ko'rsatildi:"} <strong>{comparisonData.rows.length}</strong>{" "}
              {isRu ? "запчастей" : "ta tovar"}
            </div>
          </div>
        </Card>
      </div>

      {/* Comparison Matrix Table with Sticky Header */}
      <Card className="rounded-2xl p-3 md:p-4 card-elevated border-border/60">
        <div className="overflow-x-auto rounded-xl border border-border/60 max-h-[calc(100vh-290px)] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/95 backdrop-blur sticky top-0 z-10 shadow-xs">
              <TableRow>
                <TableHead className="w-12 text-center text-xs">№</TableHead>
                <TableHead className="min-w-[180px]">
                  {isRu ? "Товар и модель авто" : "Tovar va Moshina modeli"}
                </TableHead>
                <TableHead className="text-center min-w-[90px]">
                  {isRu ? "Регионы" : "Hududlar"}
                </TableHead>
                {comparisonData.activeRegions.map((reg) => (
                  <TableHead key={reg} className="text-center min-w-[120px]">
                    <div className="flex items-center justify-center gap-1 font-semibold text-foreground">
                      <MapPin className="h-3 w-3 text-primary" />
                      <span>{reg}</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[110px]">
                  {isRu ? "Разница цен" : "Narx farqi"}
                </TableHead>
                <TableHead className="text-center min-w-[190px]">
                  {isRu ? "Анализ и рекомендация" : "Xulosa & Tavsiya"}
                </TableHead>
                <TableHead className="text-right min-w-[80px] pr-4">
                  {isRu ? "Действие" : "Amallar"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonData.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={comparisonData.activeRegions.length + 6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="max-w-md mx-auto space-y-2">
                      <ArrowUpDown className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                      <div className="font-semibold text-foreground">
                        {isRu
                          ? "Данные для сравнения не найдены"
                          : "Taqqoslash uchun kirimlar topilmadi"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {isRu
                          ? "Добавьте поступления с указанием разных областей, чтобы увидеть разницу цен"
                          : "Viloyatlar bo'yicha tovar kirimlarini kiriting, tizim avtomatik solishtirib beradi"}
                      </div>
                      <Button size="sm" onClick={onOpenNewIncoming} className="mt-2">
                        <Plus className="h-4 w-4 mr-1" />{" "}
                        {isRu ? "Новое поступление" : "Yangi kirim"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                comparisonData.rows.map((row, idx) => (
                  <PriceComparisonRow
                    key={row.productId}
                    index={idx}
                    row={row}
                    activeRegions={comparisonData.activeRegions}
                    usdRate={usdRate}
                    isRu={isRu}
                    onSelectProductForHistory={onSelectProductForHistory}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
