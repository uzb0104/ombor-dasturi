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
import { formatSom } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { paymentLabel } from "@/lib/i18n/helpers";
import { Wallet, Check } from "lucide-react";

interface SupplierDebtPayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName: string;
  maxDebt: number;
  amount: number;
  setAmount: (val: number) => void;
  payMethod: "Naqd" | "Karta";
  setPayMethod: (val: "Naqd" | "Karta") => void;
  note: string;
  setNote: (val: string) => void;
  onSubmit: () => void;
}

export function SupplierDebtPayDialog({
  open,
  onOpenChange,
  targetName,
  maxDebt,
  amount,
  setAmount,
  payMethod,
  setPayMethod,
  note,
  setNote,
  onSubmit,
}: SupplierDebtPayDialogProps) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border rounded-2xl shadow-elevated p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> {t("debts.payTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border/40 space-y-1">
            <div className="text-xs text-muted-foreground uppercase font-semibold">
              {t("common.supplier")}
            </div>
            <div className="font-bold text-base text-foreground">{targetName}</div>
            <div className="flex justify-between text-xs pt-1.5 border-t border-border/60">
              <span className="text-muted-foreground">{t("debts.totalDebt")}</span>
              <span className="font-bold text-destructive tabular-nums">{formatSom(maxDebt)}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              {t("debts.paymentAmount")} *
            </Label>
            <Input
              type="number"
              className="mt-1"
              max={maxDebt}
              value={amount}
              onChange={(e) => setAmount(Math.min(maxDebt, Math.max(0, +e.target.value)))}
            />
            <div className="mt-1 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setAmount(Math.round(maxDebt / 2))}
                className="text-[10px] bg-muted hover:bg-muted/80 px-2 py-0.5 rounded border font-medium"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setAmount(maxDebt)}
                className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/20 font-medium"
              >
                {t("debts.allAmount")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t("sales.payment")}
              </Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v as "Naqd" | "Karta")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Naqd">{paymentLabel(t, "Naqd")}</SelectItem>
                  <SelectItem value="Karta">{paymentLabel(t, "Karta")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                {t("debts.remainingDebt")}
              </Label>
              <div className="h-9 border rounded-md px-3 bg-muted/20 flex items-center mt-1 text-sm font-semibold tabular-nums text-foreground">
                {formatSom(maxDebt - amount)}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              {t("expenses.note")}
            </Label>
            <Input
              placeholder={t("debts.notePh")}
              className="mt-1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={amount <= 0}>
            <Check className="h-4 w-4 mr-1" />
            {t("debts.confirmPayment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
