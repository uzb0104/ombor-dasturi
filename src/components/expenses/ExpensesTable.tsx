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
import {
  usePagination,
  PaginationBar,
  BulkBar,
  SelectCell,
  type useSelection,
} from "@/components/ui-kit";
import { formatSom, formatDate } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { expenseCategoryLabel } from "@/lib/i18n/expense-cats";
import { Edit, Trash2 } from "lucide-react";
import type { Expense } from "@/lib/types";

interface ExpensesTableProps {
  expenses: Expense[];
  sel: ReturnType<typeof useSelection>;
  onEdit: (id: string) => void;
  onDeleteOne: (id: string) => void;
  onDeleteBulk: () => void;
}

export function ExpensesTable({
  expenses,
  sel,
  onEdit,
  onDeleteOne,
  onDeleteBulk,
}: ExpensesTableProps) {
  const t = useT();
  const pg = usePagination(expenses, 50);
  const pageIds = pg.paged.map((p) => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => sel.has(id));

  return (
    <>
      <BulkBar
        count={sel.count}
        onDelete={onDeleteBulk}
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
                  <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
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
                    <Button variant="ghost" size="icon" onClick={() => onEdit(e.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteOne(e.id)}>
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
    </>
  );
}
