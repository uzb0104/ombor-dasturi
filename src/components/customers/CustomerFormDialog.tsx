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

export type CustomerFormData = {
  name: string;
  phone: string;
  address: string;
  vehicle: string;
};

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: string | null;
  form: CustomerFormData;
  setForm: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  vehicleBrands: string[];
  onSubmit: () => void;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  vehicleBrands,
  onSubmit,
}: CustomerFormDialogProps) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border rounded-2xl shadow-elevated p-6 max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t("crm.edit") : t("crm.new")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>{t("crm.name")} *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("crm.phone")}</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+998 90 123 45 67"
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("crm.address")}</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("crm.vehicle")}</Label>
            <Select value={form.vehicle} onValueChange={(v) => setForm({ ...form, vehicle: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vehicleBrands.map((b: string) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onSubmit}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
