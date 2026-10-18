import React, { useState, useEffect } from "react";
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
import { toast } from "sonner";
import type { Supplier } from "@/lib/types";

export type SupForm = {
  name: string;
  phone: string;
  address: string;
};

export const emptySupForm = (): SupForm => ({
  name: "",
  phone: "",
  address: "",
});

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSupplier: Supplier | null;
  onSave: (form: SupForm, editingId: string | null) => void;
  isRu: boolean;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  editingSupplier,
  onSave,
  isRu,
}: SupplierFormDialogProps) {
  const [form, setForm] = useState<SupForm>(emptySupForm());

  useEffect(() => {
    if (editingSupplier) {
      setForm({
        name: editingSupplier.name,
        phone: editingSupplier.phone || "",
        address: editingSupplier.address || "",
      });
    } else {
      setForm(emptySupForm());
    }
  }, [editingSupplier, open]);

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error(isRu ? "Введите имя поставщика" : "Yetkazuvchi nomini kiriting");
      return;
    }
    onSave(form, editingSupplier?.id || null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border rounded-2xl shadow-elevated p-6 max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingSupplier
              ? isRu
                ? "Редактировать поставщика"
                : "Yetkazuvchini tahrirlash"
              : isRu
                ? "Новый поставщик"
                : "Yangi yetkazuvchi"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>{isRu ? "Имя / Организация *" : "Nomi / Tashkilot *"}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{isRu ? "Телефон" : "Telefon raqami"}</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{isRu ? "Адрес / Регион" : "Manzil / Viloyat"}</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder={isRu ? "например: Андижан" : "masalan: Andijon"}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>{isRu ? "Сохранить" : "Saqlash"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
