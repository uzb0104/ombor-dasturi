import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Trash2, HandCoins, Minus, Plus, Banknote } from "lucide-react";
import { formatSom } from "@/lib/constants";
import { useLang } from "@/lib/i18n";
import type { CartItem } from "./SalesPosView";

interface SalesPosCartProps {
  cart: CartItem[];
  subtotal: number;
  paymentType: "Naqd" | "Karta" | "O'tkazma";
  setPaymentType: (t: "Naqd" | "Karta" | "O'tkazma") => void;
  updateItemQty: (productId: string, delta: number) => void;
  setItemExactQty: (productId: string, rawVal: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  onOpenDebtDialog: () => void;
  onCheckout: () => void;
}

export function SalesPosCart({
  cart,
  subtotal,
  paymentType,
  setPaymentType,
  updateItemQty,
  setItemExactQty,
  removeFromCart,
  clearCart,
  onOpenDebtDialog,
  onCheckout,
}: SalesPosCartProps) {
  const { lang } = useLang();

  return (
    <Card className="rounded-2xl border-border/80 shadow-lg bg-card overflow-hidden flex flex-col">
      {/* Cart Header */}
      <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground truncate">
              {lang === "ru" ? "Корзина кассы" : "Kassa Savati"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {cart.length === 0
                ? lang === "ru"
                  ? "Корзина пуста"
                  : "Savat bo'sh"
                : `${cart.length} ${lang === "ru" ? "поз." : "xil mahsulot"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Qarzga sotuv tugmasi */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenDebtDialog}
            className="h-8 px-2.5 text-xs font-bold border-amber-500/50 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/40 shadow-xs transition-colors cursor-pointer"
            title={
              lang === "ru"
                ? "Оформить товары в корзине в долг"
                : "Savatdagi mahsulotlarni qarzga rasmiylashtirish"
            }
          >
            <HandCoins className="h-3.5 w-3.5 mr-1 text-amber-500" />
            {lang === "ru" ? "В долг" : "Qarzga sotuv"}
          </Button>

          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              {lang === "ru" ? "Очистить" : "Tozalash"}
            </Button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="p-3.5 divide-y divide-border/50 max-h-[310px] overflow-y-auto">
        {cart.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <ShoppingCart className="h-10 w-10 mx-auto opacity-30 stroke-1" />
            <p className="text-xs">
              {lang === "ru" ? "Корзина пока пуста" : "Savat hozircha bo'sh"}
            </p>
            <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto">
              {lang === "ru"
                ? "Выберите товары слева или отсканируйте штрих-код."
                : "Chap tarafdan tovarlarni tanlang yoki shtrix kodni skanerlang."}
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.productId} className="py-2.5 first:pt-0 last:pb-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 font-normal bg-muted/60 shrink-0"
                    >
                      {item.vehicle}
                    </Badge>
                    <h5 className="font-semibold text-xs text-foreground truncate">
                      {item.productName}
                    </h5>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {lang === "ru" ? "На складе:" : "Omborda:"} {item.availableStock}{" "}
                    {lang === "ru" ? "шт." : "ta"}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromCart(item.productId)}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center justify-between gap-3">
                {/* Stepper */}
                <div className="flex items-center border border-border/80 rounded-lg bg-background shadow-xs">
                  <button
                    type="button"
                    onClick={() => updateItemQty(item.productId, -1)}
                    className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-l-lg transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={item.availableStock}
                    value={item.qty}
                    onChange={(e) => setItemExactQty(item.productId, Number(e.target.value))}
                    className="w-10 h-7 text-center text-xs font-bold bg-transparent border-0 focus:outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => updateItemQty(item.productId, 1)}
                    disabled={item.qty >= item.availableStock}
                    className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-r-lg disabled:opacity-30 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Fixed Warehouse Price Display & Total */}
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block tabular-nums">
                    {formatSom(item.price)} × {item.qty}
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-foreground tabular-nums block">
                    {formatSom(item.qty * item.price)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Checkout Section */}
      <div className="p-4 border-t border-border/70 bg-muted/15 space-y-3.5">
        {/* Payment Method Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">
            {lang === "ru" ? "Способ оплаты" : "To'lov usuli"}
          </Label>
          <div className="grid grid-cols-3 gap-1.5">
            {(["Naqd", "Karta", "O'tkazma"] as const).map((type) => {
              const isActive = paymentType === type;
              const label =
                lang === "ru"
                  ? type === "Naqd"
                    ? "Наличные"
                    : type === "Karta"
                      ? "Карта"
                      : "Перевод"
                  : type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPaymentType(type)}
                  className={`h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border/70 text-foreground hover:bg-muted/50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <div className="flex justify-between items-baseline pt-1">
            <span className="text-sm font-bold text-foreground">
              {lang === "ru" ? "ИТОГО К ОПЛАТЕ:" : "JAMI TO'LOV:"}
            </span>
            <span className="text-xl font-black text-primary tabular-nums tracking-tight">
              {formatSom(subtotal)}
            </span>
          </div>
        </div>

        {/* Checkout CTA */}
        <Button
          size="lg"
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="w-full h-12 rounded-xl text-sm font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200"
        >
          <Banknote className="h-5 w-5 mr-2" />
          {lang === "ru" ? "Завершить продажу" : "Savdoni yakunlash"}
        </Button>
      </div>
    </Card>
  );
}
