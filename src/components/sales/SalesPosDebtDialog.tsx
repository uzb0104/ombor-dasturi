import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HandCoins, AlertCircle, User, Check } from "lucide-react";
import { formatSom } from "@/lib/constants";
import { useLang } from "@/lib/i18n";
import type { Customer } from "@/lib/types";

interface SalesPosDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  cartCount: number;
  customers: Customer[];
  customerMode: "existing" | "new";
  setCustomerMode: (mode: "existing" | "new") => void;
  selectedDebtCustId: string;
  setSelectedDebtCustId: (id: string) => void;
  selectedDebtCust: Customer | null;
  newDebtCustName: string;
  setNewDebtCustName: (name: string) => void;
  newDebtCustPhone: string;
  setNewDebtCustPhone: (phone: string) => void;
  debtInitialPaid: number;
  setDebtInitialPaid: (val: number) => void;
  onConfirm: () => void;
}

export function SalesPosDebtDialog({
  open,
  onOpenChange,
  subtotal,
  cartCount,
  customers,
  customerMode,
  setCustomerMode,
  selectedDebtCustId,
  setSelectedDebtCustId,
  selectedDebtCust,
  newDebtCustName,
  setNewDebtCustName,
  newDebtCustPhone,
  setNewDebtCustPhone,
  debtInitialPaid,
  setDebtInitialPaid,
  onConfirm,
}: SalesPosDebtDialogProps) {
  const { lang } = useLang();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <HandCoins className="h-4 w-4" />
            </div>
            {lang === "ru" ? "Оформление продажи в долг" : "Qarzga sotuv rasmiylashtirish"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Bo'sh savat ogohlantirishi */}
          {cartCount === 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {lang === "ru"
                  ? "Корзина пока пуста! Выберите товары слева."
                  : "Savat hozircha bo'sh! Chap tarafdan tovarlarni tanlang."}
              </span>
            </div>
          )}

          {/* Savat summasi */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">
                {lang === "ru" ? "Общая сумма покупки:" : "Jami xarid summasi:"}
              </span>
              <span className="text-base font-black text-foreground tabular-nums">
                {formatSom(subtotal)}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {cartCount === 0
                ? lang === "ru"
                  ? "Корзина пуста"
                  : "Savat bo'sh"
                : `${cartCount} ${lang === "ru" ? "поз." : "xil tovar"}`}
            </Badge>
          </div>

          {/* Mijoz rejimi: Mavjud mijoz yoki Yangi mijoz */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                {lang === "ru" ? "Клиент-должник" : "Qarzdor mijoz"}
              </Label>
              <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCustomerMode("existing")}
                  className={`px-2 py-0.5 rounded font-medium transition-all ${
                    customerMode === "existing"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "ru" ? "Существующий клиент" : "Mavjud mijoz"}
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode("new")}
                  className={`px-2 py-0.5 rounded font-medium transition-all ${
                    customerMode === "new"
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "ru" ? "+ Новый клиент" : "+ Yangi mijoz"}
                </button>
              </div>
            </div>

            {customerMode === "existing" ? (
              <div className="space-y-1">
                {customers.length === 0 ? (
                  <div className="p-3 rounded-xl border border-dashed border-border/80 text-xs text-muted-foreground text-center bg-muted/20">
                    {lang === "ru" ? (
                      <>
                        В базе нет клиентов. Нажмите кнопку выше{" "}
                        <strong className="text-foreground">+ Новый клиент</strong>.
                      </>
                    ) : (
                      <>
                        Bazada mijozlar mavjud emas. Yuqoridagi{" "}
                        <strong className="text-foreground">+ Yangi mijoz</strong> tugmasini bosing.
                      </>
                    )}
                  </div>
                ) : (
                  <Select value={selectedDebtCustId} onValueChange={setSelectedDebtCustId}>
                    <SelectTrigger className="h-10 text-xs bg-background">
                      <SelectValue
                        placeholder={lang === "ru" ? "Выберите клиента..." : "Mijozni tanlang..."}
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 z-[100]">
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                          {c.debt > 0
                            ? lang === "ru"
                              ? ` — Прежний долг: ${formatSom(c.debt)}`
                              : ` — Eskidan qarz: ${formatSom(c.debt)}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedDebtCust && (
                  <div className="flex items-center justify-between text-[11px] px-1 pt-1 text-muted-foreground">
                    <span>
                      {lang === "ru" ? "Тел:" : "Tel:"}{" "}
                      {selectedDebtCust.phone || (lang === "ru" ? "нет" : "yo'q")}
                    </span>
                    {selectedDebtCust.debt > 0 && (
                      <span className="text-destructive font-semibold">
                        {lang === "ru" ? "Текущий долг:" : "Mavjud qarzi:"}{" "}
                        {formatSom(selectedDebtCust.debt)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <Input
                    placeholder={
                      lang === "ru"
                        ? "Имя и фамилия клиента (например: Рустам Акрамов)"
                        : "Mijoz ismi va familiyasi (masalan: Rustam Akramov)"
                    }
                    value={newDebtCustName}
                    onChange={(e) => setNewDebtCustName(e.target.value)}
                    className="h-9 text-xs bg-background"
                  />
                </div>
                <div>
                  <Input
                    placeholder={
                      lang === "ru"
                        ? "Номер телефона (например: +998 90 123 45 67)"
                        : "Telefon raqami (masalan: +998 90 123 45 67)"
                    }
                    value={newDebtCustPhone}
                    onChange={(e) => setNewDebtCustPhone(e.target.value)}
                    className="h-9 text-xs bg-background"
                  />
                </div>
              </div>
            )}
          </div>

          {/* To'lov taqsimoti */}
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground">
                  {lang === "ru" ? "Оплачивается сейчас (сум)" : "Hozir to'lanadi (so'm)"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={subtotal}
                  value={debtInitialPaid || ""}
                  placeholder="0"
                  onChange={(e) => setDebtInitialPaid(Math.max(0, Number(e.target.value)))}
                  className="h-9 text-xs bg-background mt-1 font-semibold tabular-nums"
                />
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block">
                  {lang === "ru" ? "Записывается в долг" : "Qarzga yoziladi"}
                </span>
                <div className="h-9 mt-1 flex items-center px-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs font-bold text-destructive tabular-nums">
                  {formatSom(Math.max(0, subtotal - (Number(debtInitialPaid) || 0)))}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              ℹ️{" "}
              {lang === "ru" ? (
                <>
                  Этот долг автоматически поступит в раздел <strong>Задолженность</strong> и
                  запишется на клиента.
                </>
              ) : (
                <>
                  Ushbu qarz avtomatik ravishda <strong>Qarzlar</strong> bo'limiga tushadi va mijoz
                  hisobiga yoziladi.
                </>
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            {lang === "ru" ? "Отмена" : "Bekor qilish"}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={cartCount === 0}
            className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
          >
            <Check className="h-4 w-4 mr-1.5" />
            {cartCount === 0
              ? lang === "ru"
                ? "Корзина пуста"
                : "Savat bo'sh"
              : lang === "ru"
                ? "Подтвердить продажу в долг"
                : "Qarzga sotishni tasdiqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
