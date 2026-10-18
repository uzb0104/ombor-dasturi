import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useT } from "@/lib/i18n";
import { EXPENSE_CAT_VALUES, expenseCategoryLabel } from "@/lib/i18n/expense-cats";

export type ExpenseFormData = {
  category: string;
  amount: number;
  note: string;
};

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: string | null;
  form: ExpenseFormData;
  setForm: React.Dispatch<React.SetStateAction<ExpenseFormData>>;
  onSubmit: () => void;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  onSubmit,
}: ExpenseFormDialogProps) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("expenses.edit") : t("expenses.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("expenses.type")}</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
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
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
