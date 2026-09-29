import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  StatCard,
  useConfirm,
  usePagination,
  PaginationBar,
  useSelection,
  BulkBar,
  SelectCell,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Receipt, Edit, Trash2, Calendar, CalendarDays, Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { EXPENSE_CAT_VALUES, expenseCategoryLabel } from "@/lib/i18n/expense-cats";

export const Route = createFileRoute("/_app/expenses")({ component: ExpensesPage });

type Form = { category: string; amount: number; note: string };
const empty = (): Form => ({ category: EXPENSE_CAT_VALUES[0]!, amount: 0, note: "" });

function ExpensesPage() {
  const t = useT();
  const { expenses, addExpense, updateExpense, deleteExpense } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty());
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  // Search and Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Date Filter States
  const [dateMode, setDateMode] = useState<"ALL" | "DAY" | "MONTH" | "YEAR">("ALL");
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const matchesDate = useCallback(
    (expenseDateIso: string) => {
      if (dateMode === "ALL") return true;
      const dateObj = new Date(expenseDateIso);
      const pDateStr = dateObj.toISOString().slice(0, 10);
      const pMonthStr = dateObj.toISOString().slice(0, 7);
      const pYearStr = dateObj.getFullYear().toString();

      if (dateMode === "DAY") return pDateStr === selectedDay;
      if (dateMode === "MONTH") return pMonthStr === selectedMonth;
      if (dateMode === "YEAR") return pYearStr === selectedYear;
      return true;
    },
    [dateMode, selectedDay, selectedMonth, selectedYear],
  );

  const getDateFilterLabel = () => {
    if (dateMode === "ALL") return "Sana bo'yicha";
    if (dateMode === "DAY") return `Kun: ${selectedDay}`;
    if (dateMode === "MONTH") return `Oy: ${selectedMonth}`;
    if (dateMode === "YEAR") return `Yil: ${selectedYear}`;
    return "Sana";
  };

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        const matchesCat = categoryFilter === "ALL" || e.category === categoryFilter;
        const noteStr = e.note || "";
        const catLabel = expenseCategoryLabel(t, e.category);
        const matchesSearch =
          noteStr.toLowerCase().includes(search.toLowerCase()) ||
          catLabel.toLowerCase().includes(search.toLowerCase()) ||
          e.amount.toString().includes(search);
        const matchesD = matchesDate(e.date);
        return matchesCat && matchesSearch && matchesD;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [expenses, categoryFilter, search, matchesDate, t]);

  const totalFiltered = filteredExpenses.reduce((a, e) => a + e.amount, 0);
  const overallTotal = expenses.reduce((a, e) => a + e.amount, 0);

  const pg = usePagination(filteredExpenses, 12);
  const pageIds = pg.paged.map((p) => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => sel.has(id));

  const startEdit = (id: string) => {
    const e = expenses.find((x) => x.id === id);
    if (!e) return;
    setEditing(id);
    setForm({ category: e.category, amount: e.amount, note: e.note });
    setOpen(true);
  };

  const submit = () => {
    if (!form.amount) {
      toast.error(t("toast.amountRequired"));
      return;
    }
    if (editing) {
      updateExpense(editing, form);
      toast.success(t("toast.updated"));
    } else {
      addExpense({
        id: `exp_${Math.random().toString(36).slice(2, 9)}`,
        date: new Date().toISOString(),
        ...form,
      });
      toast.success(t("expenses.added"));
    }
    setOpen(false);
    setEditing(null);
    setForm(empty());
  };

  const removeOne = async (id: string) => {
    const ok = await confirm({
      title: t("expenses.deleteTitle"),
      description: t("expenses.deleteDesc"),
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    const snap = expenses.find((e) => e.id === id);
    deleteExpense(id);
    toast.success(t("toast.deleted"), {
      action: snap ? { label: t("common.undo"), onClick: () => addExpense(snap) } : undefined,
    });
  };
  const removeBulk = async () => {
    const ok = await confirm({
      title: t("common.bulkDelete"),
      description: t("expenses.bulkDeleteDesc", { n: sel.count }),
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    const snaps = expenses.filter((e) => sel.has(e.id));
    snaps.forEach((e) => deleteExpense(e.id));
    sel.clear();
    toast.success(t("toast.deletedMany", { n: snaps.length }), {
      description: snaps
        .slice(0, 5)
        .map((e) => `${expenseCategoryLabel(t, e.category)}: ${formatSom(e.amount)}`)
        .join(" · "),
      action: { label: t("common.undo"), onClick: () => snaps.forEach((e) => addExpense(e)) },
    });
  };

  const isFilterActive = dateMode !== "ALL" || categoryFilter !== "ALL" || search !== "";

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader
        title={t("expenses.title")}
        subtitle={t("expenses.subtitle", { n: expenses.length })}
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setEditing(null);
                setForm(empty());
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                {t("expenses.new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? t("expenses.edit") : t("expenses.new")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>{t("expenses.type")}</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CAT_VALUES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {expenseCategoryLabel(t, c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("common.amount")}</Label>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("expenses.note")}</Label>
                  <Input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit}>{t("common.save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label={isFilterActive ? "Filtrlangan xarajatlar" : t("expenses.total")}
          value={formatSom(totalFiltered)}
          icon={Receipt}
          accent="warning"
        />
        {isFilterActive && (
          <StatCard
            label="Jami barcha xarajatlar"
            value={formatSom(overallTotal)}
            icon={Receipt}
            accent="primary"
          />
        )}
      </div>

      <Card className="rounded-2xl p-3 md:p-4">
        {/* Search and Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border/50">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Xarajatlarni qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter Select */}
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
              <SelectTrigger className="h-9 w-[150px] text-xs">
                <SelectValue placeholder="Kategoriya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Barcha turlar</SelectItem>
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

            {isFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("ALL");
                  setDateMode("ALL");
                }}
              >
                Filtrni tozash
              </Button>
            )}
          </div>
        </div>

        <BulkBar
          count={sel.count}
          onDelete={removeBulk}
          onClear={sel.clear}
          label={t("expenses.bulk")}
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)}
                  />
                </TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("expenses.type")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("expenses.note")}</TableHead>
                <TableHead className="text-right">{t("common.amount")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Xarajatlar topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                pg.paged.map((e) => (
                  <TableRow
                    key={e.id}
                    className="hover:bg-muted/40"
                    data-state={sel.has(e.id) ? "selected" : undefined}
                  >
                    <TableCell>
                      <SelectCell checked={sel.has(e.id)} onChange={() => sel.toggle(e.id)} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(e.date).toLocaleDateString("uz-UZ")}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                        {expenseCategoryLabel(t, e.category)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {e.note}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatSom(e.amount)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(e.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeOne(e.id)}>
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
    </div>
  );
}
