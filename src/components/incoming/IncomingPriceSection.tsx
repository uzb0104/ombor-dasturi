import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSom } from "@/lib/constants";

interface IncomingPriceSectionProps {
  qty: number;
  setQty: (q: number) => void;
  buyPrice: number;
  setBuyPrice: (p: number) => void;
  buyPriceUsd: number;
  setBuyPriceUsd: (p: number) => void;
  buyCurrency: "UZS" | "USD";
  setBuyCurrency: (c: "UZS" | "USD") => void;
  usdRate: number;
  isRu: boolean;
}

export function IncomingPriceSection({
  qty,
  setQty,
  buyPrice,
  setBuyPrice,
  buyPriceUsd,
  setBuyPriceUsd,
  buyCurrency,
  setBuyCurrency,
  usdRate,
  isRu,
}: IncomingPriceSectionProps) {
  return (
    <>
      {/* Qty & Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase">
            {isRu ? "Количество" : "Miqdor"} *
          </Label>
          <Input
            type="number"
            min={1}
            className="mt-1 h-10"
            value={qty}
            onChange={(e) => setQty(Math.max(1, +e.target.value))}
          />
        </div>

        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase">
            {isRu ? "Цена поступления" : "Kirim narxi"} *
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              step={buyCurrency === "USD" ? "0.01" : "1"}
              min={0}
              value={buyCurrency === "UZS" ? buyPrice || "" : buyPriceUsd || ""}
              onChange={(e) => {
                const val = Math.max(0, +e.target.value);
                if (buyCurrency === "UZS") {
                  setBuyPrice(val);
                  setBuyPriceUsd(usdRate > 0 ? Number((val / usdRate).toFixed(2)) : 0);
                } else {
                  setBuyPriceUsd(val);
                  setBuyPrice(Math.round(val * usdRate));
                }
              }}
              placeholder="0"
              className="flex-1 h-10"
            />
            <Select value={buyCurrency} onValueChange={(v: "UZS" | "USD") => setBuyCurrency(v)}>
              <SelectTrigger className="w-[95px] h-10 text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UZS">So'm</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Total calculation banner */}
      <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {isRu ? "Общая сумма прихода:" : "Jami kirim summasi:"}
        </span>
        <span className="text-base font-bold text-foreground tabular-nums">
          {formatSom(buyPrice * qty)}
        </span>
      </div>
    </>
  );
}
