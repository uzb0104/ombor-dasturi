import { useState } from "react";
import { UserPlus } from "lucide-react";
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
import { useStore } from "@/lib/store";
import { useT, useLang } from "@/lib/i18n";
import { customersApi } from "@/lib/api";
import type { Customer } from "@/lib/types";
import { toast } from "sonner";

interface QuickCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (customer: Customer) => void;
}

export function QuickCustomerDialog({ open, onOpenChange, onSuccess }: QuickCustomerDialogProps) {
  const t = useT();
  const { lang } = useLang();
  const { vehicleBrands } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [vehicle, setVehicle] = useState("Universal");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(
        lang === "ru" ? "Введите имя и фамилию клиента" : "Mijoz ism-familiyasini kiriting",
      );
      return;
    }
    if (!phone.trim()) {
      toast.error(lang === "ru" ? "Введите номер телефона" : "Telefon raqamini kiriting");
      return;
    }

    try {
      setLoading(true);
      const newCustomer: Customer = {
        id: `cus_${Math.random().toString(36).slice(2, 9)}`,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        vehicle: vehicle || "Universal",
        totalPurchases: 0,
        debt: 0,
      };

      const saved = await customersApi.create(newCustomer);
      useStore.setState((state) => ({
        customers: [saved || newCustomer, ...state.customers],
      }));

      toast.success(
        lang === "ru"
          ? `Клиент «${newCustomer.name}» добавлен`
          : `Mijoz "${newCustomer.name}" qo'shildi`,
      );
      onSuccess(saved || newCustomer);
      onOpenChange(false);
      setName("");
      setPhone("");
      setAddress("");
      setVehicle("Universal");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : lang === "ru"
            ? "Ошибка при сохранении клиента"
            : "Mijozni saqlashda xatolik",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <UserPlus className="h-4 w-4" />
            </div>
            <DialogTitle>
              {lang === "ru" ? "Добавить нового клиента" : "Yangi mijoz qo'shish"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div>
            <Label htmlFor="cust-name">
              {lang === "ru" ? "Имя и фамилия *" : "Ism-familiya *"}
            </Label>
            <Input
              id="cust-name"
              placeholder={lang === "ru" ? "Например: Жамшид Алиев" : "Masalan: Jamshid Aliyev"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="cust-phone">
              {lang === "ru" ? "Номер телефона *" : "Telefon raqam *"}
            </Label>
            <Input
              id="cust-phone"
              type="tel"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cust-address">
              {lang === "ru" ? "Адрес / Ориентир" : "Manzil / Mo'ljal"}
            </Label>
            <Input
              id="cust-address"
              placeholder={lang === "ru" ? "Город, район, улица..." : "Shahar, tuman, mahalla..."}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div>
            <Label>{lang === "ru" ? "Марка автомобиля" : "Avtomobil markasi"}</Label>
            <Select value={vehicle} onValueChange={setVehicle}>
              <SelectTrigger>
                <SelectValue placeholder={lang === "ru" ? "Выберите марку" : "Mashina tanlang"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Universal">
                  {lang === "ru" ? "Универсальный / Все" : "Universal / Barchasi"}
                </SelectItem>
                {vehicleBrands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {lang === "ru" ? "Отмена" : "Bekor qilish"}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? lang === "ru"
                  ? "Сохранение..."
                  : "Saqlanmoqda..."
                : lang === "ru"
                  ? "Сохранить клиента"
                  : "Mijozni saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
