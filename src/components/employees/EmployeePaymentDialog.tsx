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

interface EmployeePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  paymentType: "Avans" | "Oylik";
  setPaymentType: (type: "Avans" | "Oylik") => void;
  paymentAmount: number;
  setPaymentAmount: (amount: number) => void;
  paymentNote: string;
  setPaymentNote: (note: string) => void;
  onSubmit: () => void;
}

export function EmployeePaymentDialog({
  open,
  onOpenChange,
  employeeName,
  paymentType,
  setPaymentType,
  paymentAmount,
  setPaymentAmount,
  paymentNote,
  setPaymentNote,
  onSubmit,
}: EmployeePaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>To'lov kiritish: {employeeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>To'lov turi</Label>
            <Select
              value={paymentType}
              onValueChange={(val) => setPaymentType(val as "Avans" | "Oylik")}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Avans">Avans</SelectItem>
                <SelectItem value="Oylik">Oylik</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Summa (so'm)</Label>
            <Input
              type="number"
              value={paymentAmount || ""}
              onChange={(e) => setPaymentAmount(+e.target.value)}
              placeholder="Masalan: 1000000"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Izoh / Izoh matni (ixtiyoriy)</Label>
            <Input
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="Masalan: Sentabr oyi avansi"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button onClick={onSubmit}>Saqlash</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
