import React, { useState, useEffect, useMemo } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { formatSom } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { Product, ProductAttributes } from "@/lib/types";
import { ProductVehiclesPicker } from "./ProductVehiclesPicker";
import { ProductPriceSection } from "./ProductPriceSection";
import {
  ProductCategoryAttributes,
  VOLTAGE_OPTIONS,
  isBattery,
  isTire,
} from "./ProductCategoryAttributes";

export type FormState = {
  name: string;
  vehicles: string[];
  vehicle: string;
  category: string;
  buyPrice: number;
  buyPriceUsd: number;
  sellPrice: number;
  sellPriceUsd: number;
  quantity: number;
  minQty: number;
  unitBrand: string;
  amperage: string;
  voltage: string;
  customVoltage: string;
  tireSize: string;
  tireSeason: string;
};

export const emptyForm = (firstCategory: string, firstBrand: string): FormState => ({
  name: "",
  vehicles: firstBrand ? [firstBrand] : [],
  vehicle: firstBrand || "",
  category: firstCategory || "Dvigatel",
  buyPrice: 0,
  buyPriceUsd: 0,
  sellPrice: 0,
  sellPriceUsd: 0,
  quantity: 0,
  minQty: 0,
  unitBrand: "Xitoy",
  amperage: "",
  voltage: "12V",
  customVoltage: "",
  tireSize: "",
  tireSeason: "Universal",
});

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  editingProduct: Product | null;
  categories: readonly string[];
  vehicleBrands: readonly string[];
  products: Product[];
  usdRate: number;
  onSaved: () => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  editingId,
  editingProduct,
  categories,
  vehicleBrands,
  products,
  usdRate,
  onSaved,
}: ProductFormDialogProps) {
  const t = useT();
  const { addProduct, updateProduct } = useStore();
  const [buyCurrency, setBuyCurrency] = useState<"UZS" | "USD">("USD");
  const [categoryComboOpen, setCategoryComboOpen] = useState(false);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
    [categories],
  );

  const [form, setForm] = useState<FormState>(
    emptyForm(categories[0] || "Dvigatel", vehicleBrands[0] || ""),
  );

  useEffect(() => {
    if (editingProduct && editingId) {
      setBuyCurrency(
        editingProduct.currency === "UZS" && !editingProduct.buyPriceUsd ? "UZS" : "USD",
      );
      const a = editingProduct.attributes || {};
      const v = a.voltage || "12V";
      const isPreset = VOLTAGE_OPTIONS.includes(v);
      const buyUsd =
        editingProduct.buyPriceUsd ??
        (usdRate > 0 && editingProduct.buyPrice > 0
          ? Number((editingProduct.buyPrice / usdRate).toFixed(2))
          : 0);
      const sellUsd =
        editingProduct.sellPriceUsd ??
        (usdRate > 0 && editingProduct.sellPrice > 0
          ? Number((editingProduct.sellPrice / usdRate).toFixed(2))
          : 0);
      const attrVehicles = (editingProduct.attributes as { vehicles?: string[] } | undefined)
        ?.vehicles;
      const initialVehicles =
        Array.isArray(editingProduct.vehicles) && editingProduct.vehicles.length > 0
          ? editingProduct.vehicles
          : Array.isArray(attrVehicles) && attrVehicles.length > 0
            ? attrVehicles
            : editingProduct.vehicle
              ? editingProduct.vehicle
                  .split(/,\s*/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : vehicleBrands[0]
                ? [vehicleBrands[0]]
                : [];
      setForm({
        name: editingProduct.name,
        vehicles: initialVehicles,
        vehicle: editingProduct.vehicle || initialVehicles.join(", "),
        category: editingProduct.category || categories[0] || "Dvigatel",
        buyPrice: editingProduct.buyPrice,
        buyPriceUsd: buyUsd,
        sellPrice: editingProduct.sellPrice || editingProduct.buyPrice,
        sellPriceUsd: sellUsd || buyUsd,
        quantity: editingProduct.quantity,
        minQty: editingProduct.minQty,
        unitBrand: a.unitBrand || "Xitoy",
        amperage: a.amperage || "",
        voltage: isPreset ? v : "custom",
        customVoltage: isPreset ? "" : v,
        tireSize: a.tireSize || "",
        tireSeason: a.tireSeason || "Universal",
      });
    } else if (open) {
      setBuyCurrency("USD");
      setForm(emptyForm(categories[0] || "Dvigatel", vehicleBrands[0] || ""));
    }
  }, [editingProduct, editingId, open, categories, vehicleBrands, usdRate]);

  const duplicateMatch = useMemo(() => {
    if (editingId || !form.name.trim()) return null;
    const normName = form.name.trim().toLowerCase();
    const currentVehs = form.vehicles.filter(Boolean);
    const normVehStr = currentVehs.join(", ").toLowerCase();

    return products.find((p) => {
      const pName = (p.name || "").trim().toLowerCase();
      if (pName !== normName) return false;
      if (currentVehs.length > 0) {
        const pVehStr = (p.vehicle || "").trim().toLowerCase();
        return pVehStr === normVehStr;
      }
      return true;
    });
  }, [editingId, form.name, form.vehicles, products]);

  const submit = () => {
    if (!form.name.trim()) {
      toast.error(t("products.nameRequired"));
      return;
    }
    if (categories.length === 0) {
      toast.error(t("products.categoriesNotLoaded"));
      return;
    }
    const category = categories.includes(form.category)
      ? form.category
      : categories[0] || "Dvigatel";
    const selectedVehicles =
      form.vehicles.length > 0
        ? Array.from(new Set(form.vehicles.filter(Boolean)))
        : vehicleBrands[0]
          ? [vehicleBrands[0]]
          : ["Barchasi"];
    const vehicleString = selectedVehicles.join(", ");
    const attributes: ProductAttributes = {};
    if (form.unitBrand.trim()) attributes.unitBrand = form.unitBrand.trim();
    if (isBattery(category)) {
      if (!form.amperage.trim()) {
        toast.error(t("products.batteryRequired"));
        return;
      }
      attributes.amperage = form.amperage.trim();
      const finalVoltage =
        form.voltage === "custom"
          ? form.customVoltage.trim() || "Boshqa"
          : form.voltage.trim() || "12V";
      attributes.voltage = finalVoltage;
    }
    if (isTire(category)) {
      if (!form.tireSize.trim()) {
        toast.error(t("products.tireSizeRequired"));
        return;
      }
      attributes.tireSize = form.tireSize.trim();
      attributes.tireSeason = form.tireSeason;
    }
    const payload = {
      name: form.name.trim(),
      barcode: "",
      sku: "",
      vehicle: vehicleString,
      vehicles: selectedVehicles,
      category,
      supplierId: editingId ? products.find((p) => p.id === editingId)?.supplierId || null : null,
      buyPrice: form.buyPrice,
      buyPriceUsd: form.buyPriceUsd,
      sellPrice: form.sellPrice || form.buyPrice,
      sellPriceUsd: form.sellPriceUsd || form.buyPriceUsd,
      quantity: form.quantity,
      minQty: form.minQty,
      attributes: Object.keys(attributes).length ? attributes : undefined,
    };

    if (editingId) {
      updateProduct(editingId, payload);
      toast.success(t("products.updated"));
    } else {
      const normName = payload.name.trim().toLowerCase();
      const normVeh = (payload.vehicle || "").trim().toLowerCase();

      const existingProduct = products.find((p) => {
        const pName = (p.name || "").trim().toLowerCase();
        const pVeh = (p.vehicle || "").trim().toLowerCase();
        if (pName !== normName) return false;
        if (normVeh && pVeh && normVeh !== pVeh) return false;
        return true;
      });

      if (existingProduct) {
        const addedQty = Number(payload.quantity) || 0;
        const oldQty = Number(existingProduct.quantity) || 0;
        const newTotalQty = oldQty + addedQty;

        const updatedPayload: Partial<Product> = {
          ...existingProduct,
          quantity: newTotalQty,
          buyPrice: payload.buyPrice > 0 ? payload.buyPrice : existingProduct.buyPrice,
          buyPriceUsd:
            (payload.buyPriceUsd || 0) > 0 ? payload.buyPriceUsd : existingProduct.buyPriceUsd,
          sellPrice: payload.sellPrice > 0 ? payload.sellPrice : existingProduct.sellPrice,
          sellPriceUsd:
            (payload.sellPriceUsd || 0) > 0 ? payload.sellPriceUsd : existingProduct.sellPriceUsd,
          minQty: payload.minQty > 0 ? payload.minQty : existingProduct.minQty,
        };

        updateProduct(existingProduct.id, updatedPayload);
        toast.success(
          `"${existingProduct.name}" bazada mavjud ekan! Yangi qator ochilmadi, qoldig'i ${oldQty} tadan ${newTotalQty} taga oshirildi.`,
          { duration: 5000 },
        );
      } else {
        addProduct({ id: `prd_${Math.random().toString(36).slice(2, 9)}`, ...payload });
        toast.success(t("products.created"));
      }
    }
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border rounded-2xl shadow-elevated">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingId ? "Tovarni tahrirlash" : "Yangi tovar"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nomi */}
          <div>
            <Label className="text-sm font-semibold text-foreground">Nomi *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Masalan: Tormoz kolodkasi"
              className="mt-1"
            />
            {duplicateMatch && (
              <div className="mt-2 flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <span className="font-semibold">Bazada mavjud tovar!</span> Hozir omborda{" "}
                  <span className="font-bold underline">{duplicateMatch.quantity} ta</span> bor.
                  Saqlaganingizda yangi qator ochilmaydi, kiritgan miqdoringiz avtomatik mavjud
                  qoldiqqa qo'shiladi.
                </div>
              </div>
            )}
          </div>

          {/* Mos keladigan avtomobillar */}
          <ProductVehiclesPicker
            vehicleBrands={vehicleBrands}
            selectedVehicles={form.vehicles}
            onChange={(vehs) =>
              setForm((f) => ({
                ...f,
                vehicles: vehs,
                vehicle: vehs.join(", "),
              }))
            }
          />

          {/* Kategoriya */}
          <div>
            <Label className="text-sm font-semibold text-foreground">Kategoriya</Label>
            <Popover open={categoryComboOpen} onOpenChange={setCategoryComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryComboOpen}
                  className="w-full justify-between mt-1 h-9 px-3 text-left font-normal bg-card hover:bg-muted/40 border-border"
                >
                  <span className="truncate">{form.category || "Kategoriyani tanlang..."}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] min-w-[240px] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Kategoriya qidirish..." autoFocus />
                  <CommandList className="max-h-60 overflow-y-auto">
                    <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                      Kategoriya topilmadi
                    </CommandEmpty>
                    <CommandGroup>
                      {sortedCategories.map((c) => (
                        <CommandItem
                          key={c}
                          value={c}
                          onSelect={() => {
                            setForm({ ...form, category: c });
                            setCategoryComboOpen(false);
                          }}
                          className="cursor-pointer hover:bg-accent/40 flex items-center justify-between py-2 px-3 text-sm"
                        >
                          <span className="font-medium">{c}</span>
                          <Check
                            className={cn(
                              "h-4 w-4 text-primary ml-2",
                              form.category === c ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Mahsulot brendi */}
          <div>
            <Label className="text-sm font-semibold text-foreground">
              Mahsulot brendi (ixtiyoriy)
            </Label>
            <Input
              value={form.unitBrand}
              onChange={(e) => setForm({ ...form, unitBrand: e.target.value })}
              placeholder="Xitoy"
              className="mt-1"
            />
          </div>

          {/* Akkumulyator yoki Shina xususiyatlari */}
          <ProductCategoryAttributes
            category={form.category}
            amperage={form.amperage}
            setAmperage={(v) => setForm({ ...form, amperage: v })}
            voltage={form.voltage}
            setVoltage={(v) => setForm({ ...form, voltage: v })}
            customVoltage={form.customVoltage}
            setCustomVoltage={(v) => setForm({ ...form, customVoltage: v })}
            tireSize={form.tireSize}
            setTireSize={(v) => setForm({ ...form, tireSize: v })}
            tireSeason={form.tireSeason}
            setTireSeason={(v) => setForm({ ...form, tireSeason: v })}
          />

          {/* Soni va Min qoldiq */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-semibold text-foreground">Soni</Label>
              <Input
                type="number"
                min="0"
                value={form.quantity || ""}
                placeholder="0"
                onChange={(e) =>
                  setForm({
                    ...form,
                    quantity: e.target.value === "" ? 0 : Math.max(0, +e.target.value),
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-foreground">
                Min. qoldiq (ogohlantirish)
              </Label>
              <Input
                type="number"
                min="0"
                value={form.minQty || ""}
                placeholder="0"
                onChange={(e) =>
                  setForm({
                    ...form,
                    minQty: e.target.value === "" ? 0 : Math.max(0, +e.target.value),
                  })
                }
                className="mt-1"
              />
            </div>
          </div>

          {/* Narxlar */}
          <ProductPriceSection
            buyCurrency={buyCurrency}
            setBuyCurrency={setBuyCurrency}
            buyPrice={form.buyPrice}
            buyPriceUsd={form.buyPriceUsd}
            usdRate={usdRate}
            onPriceChange={(val, isUsd) => {
              if (isUsd) {
                setForm((f) => ({
                  ...f,
                  buyPriceUsd: val,
                  buyPrice: Math.round(val * usdRate),
                  sellPriceUsd: val,
                  sellPrice: Math.round(val * usdRate),
                }));
              } else {
                setForm((f) => ({
                  ...f,
                  buyPrice: val,
                  buyPriceUsd: usdRate > 0 ? Number((val / usdRate).toFixed(2)) : 0,
                  sellPrice: val,
                  sellPriceUsd: usdRate > 0 ? Number((val / usdRate).toFixed(2)) : 0,
                }));
              }
            }}
          />
        </div>

        <DialogFooter className="mt-3">
          <Button
            onClick={submit}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-xl"
          >
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
