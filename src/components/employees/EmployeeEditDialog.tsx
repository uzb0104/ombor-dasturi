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
import { ROLES } from "@/lib/constants";

export interface EmployeeEditFormData {
  name: string;
  phone: string;
  role: string;
  salary: number;
  hireDate: string;
  status: "Faol" | "Nofaol";
}

interface EmployeeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: EmployeeEditFormData;
  setForm: React.Dispatch<React.SetStateAction<EmployeeEditFormData>>;
  onSubmit: () => void;
}

export function EmployeeEditDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
}: EmployeeEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xodim ma'lumotlarini tahrirlash</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>F.I.SH</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Telefon</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Lavozim</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Oylik (so'm)</Label>
            <Input
              type="number"
              value={form.salary}
              onChange={(e) => setForm({ ...form, salary: +e.target.value })}
            />
          </div>
          <div>
            <Label>Ishga olingan sana</Label>
            <Input
              type="date"
              value={form.hireDate}
              onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Holati</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as "Faol" | "Nofaol" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Faol">Faol</SelectItem>
                <SelectItem value="Nofaol">Nofaol</SelectItem>
              </SelectContent>
            </Select>
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
