import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard, useConfirm, useSelection } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { EXPENSE_CAT_VALUES, expenseCategoryLabel } from "@/lib/i18n/expense-cats";
import { ExpenseFormDialog, type ExpenseFormData } from "./ExpenseFormDialog";
import { ExpenseFilterBar, type ExpenseDateMode } from "./ExpenseFilterBar";
import { ExpensesTable } from "./ExpensesTable";

const emptyForm = (): ExpenseFormData => ({
  category: EXPENSE_CAT_VALUES[0]!,
  amount: 0,
  note: "",
});

export function ExpensesPage() {
  const t = useT();
  const { expenses, addExpense, updateExpense, deleteExpense } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseFormData>(emptyForm());
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  // Search and Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Date Filter States
  const [dateMode, setDateMode] = useState<ExpenseDateMode>("ALL");
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
    setForm(emptyForm());
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

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("ALL");
    setDateMode("ALL");
  };

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader
        title={t("expenses.title")}
        subtitle={t("expenses.subtitle", { n: expenses.length })}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setForm(emptyForm());
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("expenses.new")}
          </Button>
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
        <ExpenseFilterBar
          search={search}
          setSearch={setSearch}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          dateMode={dateMode}
          setDateMode={setDateMode}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          datePopoverOpen={datePopoverOpen}
          setDatePopoverOpen={setDatePopoverOpen}
          isFilterActive={isFilterActive}
          onClearFilters={handleClearFilters}
        />

        <ExpensesTable
          expenses={filteredExpenses}
          sel={sel}
          onEdit={startEdit}
          onDeleteOne={removeOne}
          onDeleteBulk={removeBulk}
        />
      </Card>

      <ExpenseFormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setForm(emptyForm());
          }
        }}
        editing={editing}
        form={form}
        setForm={setForm}
        onSubmit={submit}
      />
    </div>
  );
}
