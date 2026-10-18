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
import { useT } from "@/lib/i18n";

export const VOLTAGE_OPTIONS = ["6V", "12V", "24V", "36V", "48V", "60V", "72V"];
export const isBattery = (cat: string) => /akkumulyator/i.test(cat);
export const isTire = (cat: string) => /shina|balon/i.test(cat);

interface ProductCategoryAttributesProps {
  category: string;
  amperage: string;
  setAmperage: (v: string) => void;
  voltage: string;
  setVoltage: (v: string) => void;
  customVoltage: string;
  setCustomVoltage: (v: string) => void;
  tireSize: string;
  setTireSize: (v: string) => void;
  tireSeason: string;
  setTireSeason: (v: string) => void;
}

export function ProductCategoryAttributes({
  category,
  amperage,
  setAmperage,
  voltage,
  setVoltage,
  customVoltage,
  setCustomVoltage,
  tireSize,
  setTireSize,
  tireSeason,
  setTireSeason,
}: ProductCategoryAttributesProps) {
  const t = useT();

  if (isBattery(category)) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border rounded-xl bg-muted/10">
        <div>
          <Label className="text-sm font-semibold">{t("products.form.amperage")}</Label>
          <Input
            value={amperage}
            onChange={(e) => setAmperage(e.target.value)}
            placeholder="60, 75, 100"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold">{t("products.form.voltage")}</Label>
          <Select value={voltage} onValueChange={setVoltage}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOLTAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
              <SelectItem value="custom">Boshqa (Erkin qiymat)</SelectItem>
            </SelectContent>
          </Select>
          {voltage === "custom" && (
            <Input
              value={customVoltage}
              onChange={(e) => setCustomVoltage(e.target.value)}
              placeholder="Masalan: 96V, 100V, Yig'ma batareya..."
              className="mt-2"
            />
          )}
        </div>
      </div>
    );
  }

  if (isTire(category)) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border rounded-xl bg-muted/10">
        <div>
          <Label className="text-sm font-semibold">{t("products.form.tireSize")}</Label>
          <Input
            value={tireSize}
            onChange={(e) => setTireSize(e.target.value)}
            placeholder="205/55 R16"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold">{t("products.form.tireSeason")}</Label>
          <Select value={tireSeason} onValueChange={setTireSeason}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yozgi">Yozgi</SelectItem>
              <SelectItem value="Qishki">Qishki</SelectItem>
              <SelectItem value="Universal">Universal (M+S)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return null;
}
