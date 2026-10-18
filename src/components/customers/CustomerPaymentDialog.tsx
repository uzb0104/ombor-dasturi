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
import { DollarSign } from "lucide-react";

interface CustomerPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerDebt: number;
  paymentAmount: number;
  setPaymentAmount: (amount: number) => void;
  paymentMethod: "Naqd" | "Karta";
  setPaymentMethod: (method: "Naqd" | "Karta") => void;
  paymentNote: string;
  setPaymentNote: (note: string) => void;
  onSubmit: () => void;
}

export function CustomerPaymentDialog({
  open,
  onOpenChange,
  customerName,
  customerDebt,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  paymentNote,
  setPaymentNote,
  onSubmit,
}: CustomerPaymentDialogProps) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border rounded-2xl shadow-elevated p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Qarz to'lash
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Mijoz</Label>
            <div className="mt-2 p-2 bg-muted/40 rounded-lg text-sm font-medium">
              {customerName}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Qolgan qarz
              </Label>
              <div className="mt-1 text-lg font-bold text-destructive">
                {formatSom(customerDebt)}
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                To'lov miqdori *
              </Label>
              <Input
                type="number"
                min={0}
                max={customerDebt}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Math.max(0, +e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              To'lov usuli
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as "Naqd" | "Karta")}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Naqd", "Karta"] as const).map((p) => (
                  <SelectItem key={p} value={p}>
                    {paymentLabel(t, p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase">Eslatma</Label>
            <Input
              placeholder="Ixtiyoriy"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button onClick={onSubmit} className="bg-success hover:bg-success/80">
            <DollarSign className="h-4 w-4 mr-1" />
            To'lash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
