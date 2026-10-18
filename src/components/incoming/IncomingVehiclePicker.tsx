import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";

interface IncomingVehiclePickerProps {
  vehicleBrands: readonly string[];
  selectedVehicles: string[];
  onChange: (vehicles: string[]) => void;
  isRu?: boolean;
}

export function IncomingVehiclePicker({
  vehicleBrands,
  selectedVehicles,
  onChange,
  isRu,
}: IncomingVehiclePickerProps) {
  const isAllSelected =
    vehicleBrands.length > 0 && selectedVehicles.length === vehicleBrands.length;

  const handleToggleOne = (brand: string) => {
    if (selectedVehicles.includes(brand)) {
      onChange(selectedVehicles.filter((b) => b !== brand));
    } else {
      onChange([...selectedVehicles, brand]);
    }
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...vehicleBrands]);
    }
  };

  return (
    <div className="space-y-2 border rounded-2xl p-4 bg-muted/10">
      <div className="flex items-center justify-between">
        <Label className="font-bold text-foreground text-xs uppercase tracking-wider">
          {isRu
            ? "МОДЕЛИ АВТО (ВЫБЕРИТЕ МАШИНЫ) *"
            : "MOS KELADIGAN AVTOMOBILLAR (MASHINALARNI TANLANG) *"}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs font-semibold text-foreground hover:text-primary px-2"
          onClick={handleToggleAll}
        >
          {isAllSelected
            ? isRu
              ? "Отменить выбор"
              : "Bekor qilish"
            : isRu
              ? "Выбрать все"
              : "Barchasini tanlash"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {vehicleBrands.map((b) => {
          const isSelected = selectedVehicles.includes(b);
          return (
            <button
              key={b}
              type="button"
              onClick={() => handleToggleOne(b)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all flex items-center gap-1.5 ${
                isSelected
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 font-semibold shadow-sm"
                  : "bg-background hover:bg-muted text-foreground border-border/80"
              }`}
            >
              {isSelected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white/20" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span>{b}</span>
            </button>
          );
        })}
      </div>

      {selectedVehicles.length > 0 && (
        <div className="text-xs text-muted-foreground pt-2 flex flex-wrap gap-1 items-center">
          <span>
            {isRu ? "Выбранные машины" : "Tanlangan mashinalar"} ({selectedVehicles.length}):
          </span>
          <span className="font-semibold text-foreground">{selectedVehicles.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
