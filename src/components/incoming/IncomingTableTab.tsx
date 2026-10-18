import React from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BulkBar, PaginationBar, usePagination, useSelection } from "@/components/ui-kit";
import {
  Search,
  MapPin,
  Calendar,
  Check,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";
import { formatSom, formatUsd, formatDate } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { IncomingStock, Product } from "@/lib/types";

interface IncomingTableTabProps {
  incomingSearch: string;
  setIncomingSearch: (v: string) => void;
  regionFilter: string;
  setRegionFilter: (v: string) => void;
  statusFilter: "all" | "pending" | "applied";
  setStatusFilter: (v: "all" | "pending" | "applied") => void;
  dateFilterMode: "ALL" | "TODAY" | "YESTERDAY" | "CUSTOM";
  setDateFilterMode: (v: "ALL" | "TODAY" | "YESTERDAY" | "CUSTOM") => void;
  customDate: string;
  setCustomDate: (v: string) => void;
  incomingCategories: readonly string[];
  pg: ReturnType<typeof usePagination<IncomingStock>>;
  sel: ReturnType<typeof useSelection>;
  pageIds: string[];
  allChecked: boolean;
  products: Product[];
  usdRate: number;
  isRu: boolean;
  t: (k: string, vars?: Record<string, string | number>) => string;
  onEditIncoming: (i: IncomingStock) => void;
  onDeleteIncoming: (id: string) => void;
  onBulkDelete: () => void;
  onOpenApplyModal: (ids: string[]) => void;
}

export function IncomingTableTab({
  incomingSearch,
  setIncomingSearch,
  regionFilter,
  setRegionFilter,
  statusFilter,
  setStatusFilter,
  dateFilterMode,
  setDateFilterMode,
  customDate,
  setCustomDate,
  incomingCategories,
  pg,
  sel,
  pageIds,
  allChecked,
  products,
  usdRate,
  isRu,
  t,
  onEditIncoming,
  onDeleteIncoming,
  onBulkDelete,
  onOpenApplyModal,
}: IncomingTableTabProps) {
  return (
    <Card className="rounded-2xl p-3 md:p-4 card-elevated border-border/60">
      {/* Filters Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              isRu
                ? "Поиск по товару или региону..."
                : "Tovar nomi yoki viloyat bo'yicha qidiruv..."
            }
            value={incomingSearch}
            onChange={(e) => setIncomingSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Region filter */}
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-[170px] h-9 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRu ? "Все регионы" : "Barcha viloyatlar"}</SelectItem>
            {incomingCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v: "all" | "pending" | "applied") => setStatusFilter(v)}
        >
          <SelectTrigger className="w-[170px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRu ? "Все статусы" : "Barcha holatlar"}</SelectItem>
            <SelectItem value="pending">⏳ {isRu ? "В ожидании" : "Kutilmoqda"}</SelectItem>
            <SelectItem value="applied">
              ✅ {isRu ? "Добавлено на склад" : "Bazaga qo'shilgan"}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Date Filter selector */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 text-xs">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground ml-1 mr-0.5" />
          <Input
            type="date"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setDateFilterMode("CUSTOM");
            }}
            className="h-7 text-xs w-[130px] px-2 bg-background border-border/50"
          />
          {dateFilterMode !== "ALL" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateFilterMode("ALL")}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              {isRu ? "Сбросить" : "Filtrni tozalash"}
            </Button>
          )}
        </div>
      </div>

      <BulkBar
        count={sel.count}
        onDelete={onBulkDelete}
        onClear={sel.clear}
        label={t("incoming.bulk")}
      />

      <div className="overflow-x-auto rounded-xl border border-border/60 max-h-[calc(100vh-270px)] overflow-y-auto">
        <Table>
          <TableHeader className="bg-muted/95 backdrop-blur sticky top-0 z-10 shadow-xs">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)}
                />
              </TableHead>
              <TableHead className="w-12 text-center font-bold">№</TableHead>
              <TableHead className="min-w-[105px]">{isRu ? "Дата" : "Sana"}</TableHead>
              <TableHead className="min-w-[120px]">{isRu ? "Регион" : "Viloyat"}</TableHead>
              <TableHead className="min-w-[200px]">{t("common.product")}</TableHead>
              <TableHead className="text-right min-w-[80px]">{t("products.qty")}</TableHead>
              <TableHead className="text-right min-w-[120px]">{t("common.price")}</TableHead>
              <TableHead className="text-right min-w-[130px]">{t("common.total")}</TableHead>
              <TableHead className="text-center min-w-[120px]">
                {isRu ? "Статус" : "Holati"}
              </TableHead>
              <TableHead className="text-right pr-4 min-w-[100px]">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pg.paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                  {isRu ? "Поступления не найдены." : "Kirimlar topilmadi."}
                </TableCell>
              </TableRow>
            ) : (
              pg.paged.map((i, idx) => {
                const p = products.find((x) => x.id === i.productId);
                const isPending = i.status === "pending";
                const rowNumber = (pg.page - 1) * pg.pageSize + idx + 1;

                return (
                  <TableRow
                    key={i.id}
                    className={cn("hover:bg-muted/40", isPending && "bg-amber-500/[0.04]")}
                  >
                    <TableCell>
                      <Checkbox checked={sel.has(i.id)} onCheckedChange={() => sel.toggle(i.id)} />
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground font-semibold">
                      {rowNumber}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                      {formatDate(i.date)}
                    </TableCell>
                    <TableCell>
                      {i.region ? (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1 text-primary" />
                          {i.region}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{p?.name || "Noma'lum tovar"}</div>
                      {p?.vehicle && (
                        <div className="text-[11px] text-muted-foreground">🚗 {p.vehicle}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{i.qty}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {i.currency === "USD" ||
                      (i.buyPriceUsd !== undefined && i.buyPriceUsd > 0) ? (
                        <div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            {formatUsd(i.buyPriceUsd || (usdRate > 0 ? i.buyPrice / usdRate : 0))}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            ({formatSom(i.buyPrice)})
                          </span>
                        </div>
                      ) : (
                        formatSom(i.buyPrice)
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {i.currency === "USD" ||
                      (i.buyPriceUsd !== undefined && i.buyPriceUsd > 0) ? (
                        <div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            {formatUsd(
                              (i.buyPriceUsd || (usdRate > 0 ? i.buyPrice / usdRate : 0)) * i.qty,
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            ({formatSom(i.buyPrice * i.qty)})
                          </span>
                        </div>
                      ) : (
                        formatSom(i.buyPrice * i.qty)
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      {isPending ? (
                        <Badge
                          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs cursor-pointer hover:bg-amber-500/25"
                          onClick={() => onOpenApplyModal([i.id])}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {isRu ? "В ожидании" : "Kutilmoqda"}
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {isRu ? "Добавлено" : "Qo'shilgan"}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end items-center gap-1">
                        {isPending && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={isRu ? "Добавить в базу товаров" : "Tovar bazasiga qo'shish"}
                            onClick={() => onOpenApplyModal([i.id])}
                            className="h-8 w-8 hover:bg-emerald-500/15 text-emerald-600 hover:text-emerald-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditIncoming(i)}
                          className="h-8 w-8 hover:bg-muted"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteIncoming(i.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <PaginationBar {...pg} />
      </div>
    </Card>
  );
}
