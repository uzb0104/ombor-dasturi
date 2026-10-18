import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePagination, PaginationBar, exportToExcel } from "@/components/ui-kit";
import { formatSom, formatDate } from "@/lib/constants";
import { Search, History, Calendar, CalendarDays, Download, X } from "lucide-react";
import { toast } from "sonner";
import type { EmployeePayment } from "@/lib/types";

interface EmployeePaymentsTableProps {
  payments: EmployeePayment[];
  employeeName: string;
}

export function EmployeePaymentsTable({ payments, employeeName }: EmployeePaymentsTableProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "Avans" | "Oylik">("ALL");

  // Date Filter States
  const [dateMode, setDateMode] = useState<"ALL" | "DAY" | "MONTH" | "YEAR" | "RANGE">("ALL");
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [startDate] = useState("");
  const [endDate] = useState("");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const matchesDate = (paymentDateIso: string) => {
    if (dateMode === "ALL") return true;
    const dateObj = new Date(paymentDateIso);
    const pDateStr = dateObj.toISOString().slice(0, 10);
    const pMonthStr = dateObj.toISOString().slice(0, 7);
    const pYearStr = dateObj.getFullYear().toString();

    if (dateMode === "DAY") {
      return pDateStr === selectedDay;
    }
    if (dateMode === "MONTH") {
      return pMonthStr === selectedMonth;
    }
    if (dateMode === "YEAR") {
      return pYearStr === selectedYear;
    }
    if (dateMode === "RANGE") {
      if (startDate && pDateStr < startDate) return false;
      if (endDate && pDateStr > endDate) return false;
      return true;
    }
    return true;
  };

  const getDateFilterLabel = () => {
    if (dateMode === "ALL") return "Sana bo'yicha";
    if (dateMode === "DAY") return `Kun: ${selectedDay}`;
    if (dateMode === "MONTH") return `Oy: ${selectedMonth}`;
    if (dateMode === "YEAR") return `Yil: ${selectedYear}`;
    if (dateMode === "RANGE") {
      if (startDate && endDate) return `${startDate} — ${endDate}`;
      if (startDate) return `${startDate} dan`;
      if (endDate) return `${endDate} gacha`;
      return "Davr bo'yicha";
    }
    return "Sana";
  };

  const sortedPayments = [...payments].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const filteredPayments = sortedPayments.filter((p) => {
    const matchesFilter = filterType === "ALL" || p.type === filterType;
    const dateStr = new Date(p.date).toLocaleString("uz-UZ");
    const amountStr = p.amount.toString();
    const noteStr = (p as { note?: string }).note || "";
    const matchesSearch =
      dateStr.toLowerCase().includes(search.toLowerCase()) ||
      amountStr.includes(search) ||
      noteStr.toLowerCase().includes(search.toLowerCase());

    const matchesDateFilter = matchesDate(p.date);

    return matchesFilter && matchesSearch && matchesDateFilter;
  });

  const pg = usePagination(filteredPayments, 50);

  const handleExportExcel = () => {
    const rows = filteredPayments.map((p, idx) => {
      const dt = new Date(p.date);
      return {
        index: idx + 1,
        date: formatDate(dt),
        time: dt.toLocaleTimeString("uz-UZ"),
        type: p.type,
        amount: p.amount,
        note: (p as { note?: string }).note || "—",
      };
    });

    exportToExcel(
      rows,
      [
        { label: "№", key: "index" },
        { label: "Sana", key: "date" },
        { label: "Vaqt", key: "time" },
        { label: "To'lov turi", key: "type" },
        { label: "Summa (so'm)", key: "amount" },
        { label: "Izoh", key: "note" },
      ],
      `${employeeName} - To'lovlar tarixi`,
      `xodim_${employeeName}_tarix.xls`,
    );
    toast.success("Excel yuklab olindi");
  };

  return (
    <Card className="rounded-2xl p-4 sm:p-5 border-border/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            O'zgarishlar va to'lovlar tarixi
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Xodimga berilgan barcha avans, oylik to'lovlari va sanalari vaqti bilan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as "ALL" | "Avans" | "Oylik")}
          >
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <SelectValue placeholder="To'lov turi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Barcha turlar</SelectItem>
              <SelectItem value="Avans">Faqat Avans</SelectItem>
              <SelectItem value="Oylik">Faqat Oylik</SelectItem>
            </SelectContent>
          </Select>

          {/* Calendar Date Filter Popover */}
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={dateMode !== "ALL" ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs flex items-center gap-1.5"
              >
                <Calendar className="h-4 w-4" />
                <span>{getDateFilterLabel()}</span>
                {dateMode !== "ALL" && (
                  <span
                    className="ml-1 hover:text-destructive p-0.5 rounded-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateMode("ALL");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4" align="end">
              <div className="font-semibold text-sm flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Sana bo'yicha saralash
                </span>
                {dateMode !== "ALL" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive p-1"
                    onClick={() => setDateMode("ALL")}
                  >
                    Tozalash
                  </Button>
                )}
              </div>

              {/* Filter Mode Selector */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg text-xs">
                {(["ALL", "DAY", "MONTH", "YEAR"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`py-1 px-1 rounded-md text-center transition-all ${
                      dateMode === mode
                        ? "bg-background font-semibold shadow-xs text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setDateMode(mode)}
                  >
                    {mode === "ALL"
                      ? "Barchasi"
                      : mode === "DAY"
                        ? "Kunlik"
                        : mode === "MONTH"
                          ? "Oylik"
                          : "Yillik"}
                  </button>
                ))}
              </div>

              {/* Dynamic Inputs based on mode */}
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

              {/* Preset Buttons */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-1 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => {
                    setDateMode("DAY");
                    setSelectedDay(new Date().toISOString().slice(0, 10));
                  }}
                >
                  Bugun
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => {
                    setDateMode("MONTH");
                    setSelectedMonth(new Date().toISOString().slice(0, 7));
                  }}
                >
                  Shu oy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => {
                    setDateMode("YEAR");
                    setSelectedYear(new Date().getFullYear().toString());
                  }}
                >
                  Shu yil
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={handleExportExcel}
            disabled={filteredPayments.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Excel
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-12 text-center">№</TableHead>
              <TableHead>Sana va vaqt</TableHead>
              <TableHead>To'lov / Amaliyot turi</TableHead>
              <TableHead className="text-right">Summa</TableHead>
              <TableHead>Izoh / Tafsilot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pg.paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  To'lovlar yoki o'zgarishlar tarixi topilmadi
                </TableCell>
              </TableRow>
            ) : (
              pg.paged.map((p, idx) => {
                const itemIndex = (pg.page - 1) * pg.pageSize + idx + 1;
                const dateObj = new Date(p.date);
                const formattedDate = formatDate(dateObj);
                const formattedTime = dateObj.toLocaleTimeString("uz-UZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });

                return (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="text-center text-xs text-muted-foreground font-medium">
                      {itemIndex}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="font-medium text-xs">{formattedDate}</div>
                      <div className="text-[11px] text-muted-foreground">{formattedTime}</div>
                    </TableCell>
                    <TableCell>
                      {p.type === "Avans" ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border-none font-medium"
                        >
                          Avans
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 border-none font-medium"
                        >
                          Oylik
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatSom(p.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(p as { note?: string }).note || (
                        <span className="text-xs text-muted-foreground/60">
                          {p.type === "Avans" ? "Avans to'lovi berildi" : "Oylik maosh to'landi"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PaginationBar {...pg} />
    </Card>
  );
}
