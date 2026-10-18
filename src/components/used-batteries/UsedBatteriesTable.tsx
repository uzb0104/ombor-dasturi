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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaginationBar, usePagination } from "@/components/ui-kit";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  Search,
  Calendar,
  Trash2,
  X,
  Building2,
  User,
} from "lucide-react";
import { formatSom, formatNumber, formatDate } from "@/lib/constants";
import type { UsedBatteryEntry } from "@/lib/types";

interface UsedBatteriesTableProps {
  pg: ReturnType<typeof usePagination<UsedBatteryEntry>>;
  activeTab: "ALL" | "kirim" | "chiqim";
  setActiveTab: (tab: "ALL" | "kirim" | "chiqim") => void;
  search: string;
  setSearch: (s: string) => void;
  dateMode: "ALL" | "DAY" | "MONTH" | "YEAR";
  setDateMode: (m: "ALL" | "DAY" | "MONTH" | "YEAR") => void;
  selectedDay: string;
  setSelectedDay: (d: string) => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  selectedYear: string;
  setSelectedYear: (y: string) => void;
  datePopoverOpen: boolean;
  setDatePopoverOpen: (b: boolean) => void;
  totalItemsCount: number;
  getDateFilterLabel: () => string;
  onRemove: (id: string) => void;
}

export function UsedBatteriesTable({
  pg,
  activeTab,
  setActiveTab,
  search,
  setSearch,
  dateMode,
  setDateMode,
  selectedDay,
  setSelectedDay,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  datePopoverOpen,
  setDatePopoverOpen,
  totalItemsCount,
  getDateFilterLabel,
  onRemove,
}: UsedBatteriesTableProps) {
  return (
    <Card className="rounded-2xl p-4 card-elevated border-border/60">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
        {/* Tab filter buttons */}
        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl w-fit">
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === "ALL"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("ALL")}
          >
            Barchasi ({totalItemsCount})
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
              activeTab === "kirim"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("kirim")}
          >
            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
            Qabul qilinganlar
          </button>
          <button
            type="button"
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
              activeTab === "chiqim"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("chiqim")}
          >
            <Truck className="h-3.5 w-3.5 text-primary" />
            Zavodga topshirilganlar
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Qidirish (mijoz, zavod, turi)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 text-xs gap-1.5 shrink-0 ${
                  dateMode !== "ALL" ? "border-primary text-primary font-semibold bg-primary/5" : ""
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{getDateFilterLabel()}</span>
                {dateMode !== "ALL" && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateMode("ALL");
                    }}
                    className="ml-1 hover:text-destructive p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 space-y-3" align="end">
              <div className="text-xs font-semibold flex items-center justify-between">
                <span>Sanani filtrlash</span>
                {dateMode !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setDateMode("ALL")}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Barchasini ko'rsatish
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1 p-1 bg-muted/60 rounded-lg text-xs">
                <button
                  type="button"
                  className={`py-1 px-1 rounded-md text-center transition-all ${
                    dateMode === "ALL"
                      ? "bg-background font-semibold shadow-xs text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDateMode("ALL")}
                >
                  Barchasi
                </button>
                <button
                  type="button"
                  className={`py-1 px-1 rounded-md text-center transition-all ${
                    dateMode === "DAY"
                      ? "bg-background font-semibold shadow-xs text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDateMode("DAY")}
                >
                  Kunlik
                </button>
                <button
                  type="button"
                  className={`py-1 px-1 rounded-md text-center transition-all ${
                    dateMode === "MONTH"
                      ? "bg-background font-semibold shadow-xs text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDateMode("MONTH")}
                >
                  Oylik
                </button>
                <button
                  type="button"
                  className={`py-1 px-1 rounded-md text-center transition-all ${
                    dateMode === "YEAR"
                      ? "bg-background font-semibold shadow-xs text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDateMode("YEAR")}
                >
                  Yillik
                </button>
              </div>

              {dateMode === "DAY" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Kungi sanani tanlang:</Label>
                  <Input
                    type="date"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {dateMode === "MONTH" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Oyni tanlang:</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {dateMode === "YEAR" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Yilni tanlang:</Label>
                  <Input
                    type="number"
                    min="2020"
                    max="2035"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    placeholder="2026"
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>Sana</TableHead>
              <TableHead>Operatsiya turi</TableHead>
              <TableHead>Mijoz / Zavod</TableHead>
              <TableHead>Hajm / Tur</TableHead>
              <TableHead className="text-right">Og'irlik</TableHead>
              <TableHead className="text-right">1 kg narxi</TableHead>
              <TableHead className="text-right">Jami summa</TableHead>
              <TableHead>Izoh</TableHead>
              <TableHead className="text-right pr-4">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pg.paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Eski akkumulyator yozuvlari topilmadi.
                </TableCell>
              </TableRow>
            ) : (
              pg.paged.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(item.date)}
                  </TableCell>
                  <TableCell>
                    {item.type === "kirim" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none hover:bg-emerald-500/25">
                        <ArrowDownLeft className="h-3 w-3 mr-1" /> Mijozdan Kirim
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-none hover:bg-blue-500/25">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> Zavodga Chiqim
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {item.type === "kirim" ? (
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.customerName || "—"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-primary">
                        <Building2 className="h-3.5 w-3.5" />
                        {item.factoryName || "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {item.batteryType || "Lom"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {formatNumber(item.weightKg)} kg
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {item.pricePerKg ? formatSom(item.pricePerKg) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatSom(item.totalAmount)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                    {item.note || "—"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationBar {...pg} />
    </Card>
  );
}
