import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar, CalendarDays, X } from "lucide-react";
import { useT, useLang } from "@/lib/i18n";
import { EXPENSE_CAT_VALUES, expenseCategoryLabel } from "@/lib/i18n/expense-cats";

export type ExpenseDateMode = "ALL" | "DAY" | "MONTH" | "YEAR";

interface ExpenseFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  dateMode: ExpenseDateMode;
  setDateMode: (v: ExpenseDateMode) => void;
  selectedDay: string;
  setSelectedDay: (v: string) => void;
  selectedMonth: string;
  setSelectedMonth: (v: string) => void;
  selectedYear: string;
  setSelectedYear: (v: string) => void;
  datePopoverOpen: boolean;
  setDatePopoverOpen: (v: boolean) => void;
  isFilterActive: boolean;
  onClearFilters: () => void;
}

export function ExpenseFilterBar({
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
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
  isFilterActive,
  onClearFilters,
}: ExpenseFilterBarProps) {
  const t = useT();
  const { lang } = useLang();

  const getDateFilterLabel = () => {
    if (dateMode === "ALL") return lang === "ru" ? "По дате" : "Sana bo'yicha";
    if (dateMode === "DAY") return lang === "ru" ? `День: ${selectedDay}` : `Kun: ${selectedDay}`;
    if (dateMode === "MONTH")
      return lang === "ru" ? `Месяц: ${selectedMonth}` : `Oy: ${selectedMonth}`;
    if (dateMode === "YEAR") return lang === "ru" ? `Год: ${selectedYear}` : `Yil: ${selectedYear}`;
    return lang === "ru" ? "Дата" : "Sana";
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border/50">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={lang === "ru" ? "Поиск расходов..." : "Xarajatlarni qidirish..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Category Filter Select */}
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
          <SelectTrigger className="h-9 w-[150px] text-xs">
            <SelectValue placeholder={lang === "ru" ? "Категория" : "Kategoriya"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{lang === "ru" ? "Все виды" : "Barcha turlar"}</SelectItem>
            {EXPENSE_CAT_VALUES.map((c) => (
              <SelectItem key={c} value={c}>
                {expenseCategoryLabel(t, c)}
              </SelectItem>
            ))}
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
                {lang === "ru" ? "Сортировка по дате" : "Sana bo'yicha saralash"}
              </span>
              {dateMode !== "ALL" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive p-1"
                  onClick={() => setDateMode("ALL")}
                >
                  {lang === "ru" ? "Очистить" : "Tozalash"}
                </Button>
              )}
            </div>

            {/* Filter Mode Selector */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg text-xs">
              <button
                type="button"
                className={`py-1 px-1 rounded-md text-center transition-all ${
                  dateMode === "ALL"
                    ? "bg-background font-semibold shadow-xs text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setDateMode("ALL")}
              >
                {lang === "ru" ? "Все" : "Barchasi"}
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
                {lang === "ru" ? "День" : "Kunlik"}
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
                {lang === "ru" ? "Месяц" : "Oylik"}
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
                {lang === "ru" ? "Год" : "Yillik"}
              </button>
            </div>

            {/* Dynamic Inputs based on mode */}
            {dateMode === "DAY" && (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {lang === "ru" ? "Выберите дату:" : "Kungi sanani tanlang:"}
                </Label>
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
                <Label className="text-xs">
                  {lang === "ru" ? "Выберите месяц:" : "Oyni tanlang:"}
                </Label>
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
                <Label className="text-xs">
                  {lang === "ru" ? "Выберите год:" : "Yilni tanlang:"}
                </Label>
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

        {isFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClearFilters}
          >
            Filtrni tozash
          </Button>
        )}
      </div>
    </div>
  );
}
