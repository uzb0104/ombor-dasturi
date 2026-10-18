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

interface ProductPriceSectionProps {
  buyCurrency: "UZS" | "USD";
  setBuyCurrency: (v: "UZS" | "USD") => void;
  buyPrice: number;
  buyPriceUsd: number;
  onPriceChange: (val: number, isUsd: boolean) => void;
  usdRate: number;
}

export function ProductPriceSection({
  buyCurrency,
  setBuyCurrency,
  buyPrice,
  buyPriceUsd,
  onPriceChange,
  usdRate,
}: ProductPriceSectionProps) {
  return (
    <div className="border rounded-2xl p-4 bg-muted/10 space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
        <span className="text-emerald-600 font-bold">$</span>
        <span>Narxlar (Dollar $ va So'm)</span>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-foreground">Sotib olish</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step={buyCurrency === "USD" ? "0.01" : "1"}
            min="0"
            value={buyCurrency === "USD" ? buyPriceUsd || "" : buyPrice || ""}
            onChange={(e) => {
              const val = Math.max(0, +e.target.value);
              onPriceChange(val, buyCurrency === "USD");
            }}
            placeholder="0"
            className="flex-1"
          />
          <Select value={buyCurrency} onValueChange={(v: "UZS" | "USD") => setBuyCurrency(v)}>
            <SelectTrigger className="w-[130px] shrink-0 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">Dollar ($)</SelectItem>
              <SelectItem value="UZS">So'm (UZS)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {buyCurrency === "USD" && buyPriceUsd > 0 && usdRate > 0 && (
          <div className="text-[11px] text-muted-foreground font-medium">
            ≈ {formatSom(buyPrice)} (kurs: {formatSom(usdRate)})
          </div>
        )}
        {buyCurrency === "UZS" && buyPrice > 0 && usdRate > 0 && (
          <div className="text-[11px] text-muted-foreground font-medium">
            ≈ ${buyPriceUsd} USD (kurs: {formatSom(usdRate)})
          </div>
        )}
      </div>
    </div>
  );
}
