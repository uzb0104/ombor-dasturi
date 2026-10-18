import React from "react";
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
import { ArrowDownLeft, Truck } from "lucide-react";
import { formatSom } from "@/lib/constants";
import type { Customer } from "@/lib/types";

export interface KirimFormState {
  customerName: string;
  batteryType: string;
  weightKg: number;
  totalAmount: number;
  note: string;
}

export interface ChiqimFormState {
  factoryName: string;
  weightKg: number;
  pricePerKg: number;
  paymentMethod: "Naqd" | "Karta" | "O'tkazma" | "Qarz";
  status: "To'langan" | "Kutilmoqda";
  note: string;
}

interface UsedBatteryDialogsProps {
  kirimOpen: boolean;
  setKirimOpen: (open: boolean) => void;
  kirimForm: KirimFormState;
  setKirimForm: React.Dispatch<React.SetStateAction<KirimFormState>>;
  handleKirimSubmit: () => void;
  customers: Customer[];
  chiqimOpen: boolean;
  setChiqimOpen: (open: boolean) => void;
  chiqimForm: ChiqimFormState;
  setChiqimForm: React.Dispatch<React.SetStateAction<ChiqimFormState>>;
  handleChiqimSubmit: () => void;
}

export function UsedBatteryDialogs({
  kirimOpen,
  setKirimOpen,
  kirimForm,
  setKirimForm,
  handleKirimSubmit,
  customers,
  chiqimOpen,
  setChiqimOpen,
  chiqimForm,
  setChiqimForm,
  handleChiqimSubmit,
}: UsedBatteryDialogsProps) {
  return (
    <>
      {/* Dialog 1: Mijozdan qabul qilish (Kirim) */}
      <Dialog open={kirimOpen} onOpenChange={setKirimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
              Mijozdan eski akkumulyator qabul qilish (Kirim)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Mijoz ismi / Telefon (Ixtiyoriy)</Label>
              <Input
                placeholder="Masalan: Alijon Valiyev"
                value={kirimForm.customerName}
                onChange={(e) => setKirimForm({ ...kirimForm, customerName: e.target.value })}
                className="mt-1"
              />
              {customers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Tezkor tanlash:</span>
                  {customers.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="text-[11px] bg-muted px-2 py-0.5 rounded-md hover:bg-accent transition-colors"
                      onClick={() => setKirimForm({ ...kirimForm, customerName: c.name })}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Akkumulyator hajm/amper</Label>
                <Select
                  value={kirimForm.batteryType}
                  onValueChange={(v) => setKirimForm({ ...kirimForm, batteryType: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60 Ah">60 Ah</SelectItem>
                    <SelectItem value="75 Ah">75 Ah</SelectItem>
                    <SelectItem value="90 Ah">90 Ah</SelectItem>
                    <SelectItem value="100 Ah">100 Ah</SelectItem>
                    <SelectItem value="190 Ah">190 Ah (Yuk avto)</SelectItem>
                    <SelectItem value="Lom (Aralash)">Lom (Aralash)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Og'irligi (kg)</Label>
                <Input
                  type="number"
                  placeholder="15"
                  value={kirimForm.weightKg || ""}
                  onChange={(e) => setKirimForm({ ...kirimForm, weightKg: +e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Tushib berilgan summa / Chegirma (so'm)</Label>
              <Input
                type="number"
                placeholder="180000"
                value={kirimForm.totalAmount || ""}
                onChange={(e) => setKirimForm({ ...kirimForm, totalAmount: +e.target.value })}
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Eski akkumulyator evaziga mijozga yangi batareyadan chegirma qilib berilgan summa
              </p>
            </div>

            <div>
              <Label>Izoh / Qayd (Ixtiyoriy)</Label>
              <Input
                placeholder="Masalan: Yangi 60A batareya olganda topshirdi"
                value={kirimForm.note}
                onChange={(e) => setKirimForm({ ...kirimForm, note: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setKirimOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleKirimSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              Qabul qilish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Zavodga topshirish (Chiqim) */}
      <Dialog open={chiqimOpen} onOpenChange={setChiqimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Zavodga lom topshirish (Chiqim)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Zavod / Lom oluvchi nomi</Label>
              <Input
                placeholder="Masalan: Jizzax Akkumulyator Zavodi"
                value={chiqimForm.factoryName}
                onChange={(e) => setChiqimForm({ ...chiqimForm, factoryName: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Umumiy og'irlik (kg)</Label>
                <Input
                  type="number"
                  placeholder="250"
                  value={chiqimForm.weightKg || ""}
                  onChange={(e) => setChiqimForm({ ...chiqimForm, weightKg: +e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>1 kg narxi (so'm)</Label>
                <Input
                  type="number"
                  placeholder="12500"
                  value={chiqimForm.pricePerKg || ""}
                  onChange={(e) => setChiqimForm({ ...chiqimForm, pricePerKg: +e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="p-3 bg-muted/60 rounded-xl flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Jami hisoblangan summa:</span>
              <span className="font-bold text-base text-primary">
                {formatSom(chiqimForm.weightKg * chiqimForm.pricePerKg)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>To'lov turi</Label>
                <Select
                  value={chiqimForm.paymentMethod}
                  onValueChange={(v) =>
                    setChiqimForm({
                      ...chiqimForm,
                      paymentMethod: v as "Naqd" | "Karta" | "O'tkazma" | "Qarz",
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Naqd">Naqd pul</SelectItem>
                    <SelectItem value="Karta">Bank kartasi</SelectItem>
                    <SelectItem value="O'tkazma">Bank o'tkazmasi</SelectItem>
                    <SelectItem value="Qarz">Zavod qarzdorligi (Nasiya)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>To'lov holati</Label>
                <Select
                  value={chiqimForm.status}
                  onValueChange={(v) =>
                    setChiqimForm({ ...chiqimForm, status: v as "To'langan" | "Kutilmoqda" })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To'langan">To'langan</SelectItem>
                    <SelectItem value="Kutilmoqda">Kutilmoqda (Nasiya)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Izoh / Hujjat raqami (Ixtiyoriy)</Label>
              <Input
                placeholder="Masalan: N-124 yuk xati bo'yicha"
                value={chiqimForm.note}
                onChange={(e) => setChiqimForm({ ...chiqimForm, note: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setChiqimOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handleChiqimSubmit}>Saqlash va topshirish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
