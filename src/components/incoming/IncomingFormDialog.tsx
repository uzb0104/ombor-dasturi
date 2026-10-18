import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { IncomingStock, Product } from "@/lib/types";
import { IncomingVehiclePicker } from "./IncomingVehiclePicker";
import { IncomingLiveComparison } from "./IncomingLiveComparison";
import { IncomingProductCombobox } from "./IncomingProductCombobox";
import { IncomingCategoryPicker } from "./IncomingCategoryPicker";
import { IncomingPriceSection } from "./IncomingPriceSection";

export interface IncomingFormPayload {
  productId: string;
  qty: number;
  buyPrice: number;
  buyPriceUsd?: number;
  currency?: "UZS" | "USD";
  region?: string;
  invoice: string;
  supplierId: string | null;
}

interface IncomingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: IncomingStock | null;
  onSave: (payload: IncomingFormPayload, editingId: string | null) => void;
  products: Product[];
  categories: readonly string[];
  vehicleBrands: readonly string[];
  incomingCategories: readonly string[];
  incoming: IncomingStock[];
  usdRate: number;
  isRu: boolean;
  defaultRegion?: string;
}

export function IncomingFormDialog({
  open,
  onOpenChange,
  editingItem,
  onSave,
  products,
  categories,
  vehicleBrands,
  incomingCategories,
  incoming,
  usdRate,
  isRu,
  defaultRegion,
}: IncomingFormDialogProps) {
  const { addProduct } = useStore();

  const [region, setRegion] = useState("");
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [productId, setProductId] = useState("");
  const [productCustomName, setProductCustomName] = useState("");
  const [qty, setQty] = useState(1);
  const [buyPrice, setBuyPrice] = useState(0);
  const [buyPriceUsd, setBuyPriceUsd] = useState(0);
  const [buyCurrency, setBuyCurrency] = useState<"UZS" | "USD">("UZS");

  // Combine categories from store and actual products so no category is missing
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => {
      if (c && c.trim()) set.add(c.trim());
    });
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "uz"));
  }, [categories, products]);

  // Car models from vehicleBrands (or products fallback if vehicleBrands is empty)
  const effectiveVehicleBrands = useMemo(() => {
    if (vehicleBrands && vehicleBrands.length > 0) {
      return vehicleBrands;
    }
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.vehicle && p.vehicle.trim()) set.add(p.vehicle.trim());
      if (Array.isArray(p.vehicles)) {
        p.vehicles.forEach((v) => v && v.trim() && set.add(v.trim()));
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "uz"));
  }, [vehicleBrands, products]);

  useEffect(() => {
    if (editingItem) {
      setRegion(editingItem.region || "");
      setProductId(editingItem.productId || "");
      const existingProd = products.find((p) => p.id === editingItem.productId);
      if (existingProd) {
        setProductCustomName(existingProd.name);
        setCategory(existingProd.category || "");
        const vList = existingProd.vehicles?.length
          ? existingProd.vehicles
          : existingProd.vehicle
            ? existingProd.vehicle.split(/,\s*/).filter(Boolean)
            : [];
        setSelectedVehicles(vList);
      }
      setQty(editingItem.qty || 1);
      setBuyCurrency(editingItem.currency || "UZS");
      setBuyPrice(editingItem.buyPrice || 0);
      setBuyPriceUsd(
        editingItem.buyPriceUsd !== undefined
          ? editingItem.buyPriceUsd
          : usdRate > 0 && editingItem.buyPrice > 0
            ? Number((editingItem.buyPrice / usdRate).toFixed(2))
            : 0,
      );
    } else if (open) {
      setRegion(defaultRegion || incomingCategories[0] || "");
      setSelectedVehicles([]);
      setCategory("");
      setProductId("");
      setProductCustomName("");
      setQty(1);
      setBuyPrice(0);
      setBuyPriceUsd(0);
      setBuyCurrency("UZS");
    }
  }, [editingItem, open, defaultRegion, incomingCategories, usdRate, products]);

  // Filtered products according to selected vehicle & category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Category check
      if (category && category !== "all") {
        const pCat = (p.category || "").trim().toLowerCase();
        const selCat = category.trim().toLowerCase();
        if (pCat !== selCat) {
          return false;
        }
      }

      // 2. Vehicles check
      if (selectedVehicles.length > 0) {
        const pVehStr = (p.vehicle || "").toLowerCase().trim();
        const pVehsArr = Array.isArray(p.vehicles)
          ? p.vehicles.map((v) => v.toLowerCase().trim())
          : [];
        const pNameLow = (p.name || "").toLowerCase();

        const matches = selectedVehicles.some((sv) => {
          const svLow = sv.toLowerCase().trim();
          if (!svLow) return false;

          // A. Exact match in vehicle string or vehicles array
          if (pVehStr === svLow || pVehsArr.includes(svLow)) return true;

          // B. Token word match (e.g. "T30 Reminli" has tokens "t30", "reminli")
          const pTokens = pVehStr.split(/[\s,]+/);
          if (pTokens.includes(svLow)) return true;

          // C. Normalized match ignoring hyphens/spaces (e.g. "T-50 REMIN" vs "T50", "CH-69" vs "CH69")
          const cleanSv = svLow.replace(/[-_\s]/g, "");
          const cleanVeh = pVehStr.replace(/[-_\s]/g, "");
          if (cleanVeh === cleanSv) return true;
          if (cleanVeh.split(/[\s,]+/).includes(cleanSv)) return true;

          // D. Product name contains the car brand (for products where vehicle was null, e.g. "Fitulka 41-60 ch-69", "Aporni T50")
          const cleanName = pNameLow.replace(/[-_\s]/g, "");
          if (cleanSv.length >= 3 && cleanName.includes(cleanSv)) return true;

          return false;
        });

        if (!matches) {
          return false;
        }
      }

      return true;
    });
  }, [products, category, selectedVehicles]);

  const handleProductSelect = (p: Product) => {
    setProductId(p.id);
    setProductCustomName(p.name);
    if (p.category) {
      setCategory(p.category);
    }
    if (p.vehicle) {
      const vArr = p.vehicles?.length
        ? p.vehicles
        : p.vehicle
            .split(/,\s*/)
            .map((s) => s.trim())
            .filter(Boolean);
      if (vArr.length > 0) {
        setSelectedVehicles(vArr);
      }
    }
    if (p.currency === "USD") {
      setBuyCurrency("USD");
    } else {
      setBuyCurrency("UZS");
    }
    setBuyPrice(p.buyPrice || 0);
    setBuyPriceUsd(
      p.buyPriceUsd ??
        (usdRate > 0 && p.buyPrice > 0 ? Number((p.buyPrice / usdRate).toFixed(2)) : 0),
    );
  };

  // Live price comparison helper
  const liveProductComparison = useMemo(() => {
    if (!productId) return null;
    const sameItems = incoming.filter((i) => i.productId === productId && i.region);
    if (sameItems.length === 0) return null;

    const byRegion: Record<string, number> = {};
    sameItems.forEach((i) => {
      const reg = i.region!;
      if (!byRegion[reg] || i.buyPrice < byRegion[reg]) {
        byRegion[reg] = i.buyPrice;
      }
    });

    const prices = Object.values(byRegion);
    if (prices.length < 1) return null;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { byRegion, min, max };
  }, [productId, incoming]);

  const handleSubmit = () => {
    const trimmedCustomName = productCustomName.trim();

    if (!productId && !trimmedCustomName) {
      toast.error(isRu ? "Укажите или выберите товар" : "Tovarni tanlang yoki nomini kiriting");
      return;
    }
    if (qty <= 0) {
      toast.error(isRu ? "Количество должно быть больше 0" : "Miqdor 0 dan katta bo'lishi kerak");
      return;
    }
    if (buyPrice < 0) {
      toast.error(isRu ? "Цена не может быть отрицательной" : "Narx manfiy bo'lishi mumkin emas");
      return;
    }

    let finalProductId = productId;

    // Agar yangi tovar nomi yozilgan bo'lsa va mavjud productId bo'lmasa, yangi tovar yaratamiz
    if (!finalProductId && trimmedCustomName) {
      const matchExisting = products.find(
        (p) => p.name.trim().toLowerCase() === trimmedCustomName.toLowerCase(),
      );
      if (matchExisting) {
        finalProductId = matchExisting.id;
      } else {
        const newId = `prd_${Math.random().toString(36).slice(2, 9)}`;
        addProduct({
          id: newId,
          name: trimmedCustomName,
          category: category || "Dvigatel",
          vehicle: selectedVehicles.join(", "),
          vehicles: selectedVehicles,
          buyPrice: buyPrice,
          buyPriceUsd: buyPriceUsd,
          sellPrice: buyPrice,
          sellPriceUsd: buyPriceUsd,
          quantity: 0,
          minQty: 0,
          currency: buyCurrency,
        });
        finalProductId = newId;
        toast.info(
          isRu
            ? `Создан новый товар "${trimmedCustomName}"`
            : `Yangi "${trimmedCustomName}" tovari yaratildi`,
        );
      }
    }

    const payload: IncomingFormPayload = {
      productId: finalProductId,
      qty,
      buyPrice,
      buyPriceUsd:
        buyCurrency === "USD"
          ? buyPriceUsd
          : usdRate > 0 && buyPrice > 0
            ? Number((buyPrice / usdRate).toFixed(2))
            : 0,
      currency: buyCurrency,
      invoice: "",
      supplierId: null,
      region: region.trim() || undefined,
    };

    onSave(payload, editingItem?.id || null);
    onOpenChange(false);
  };

  const hasFiltersApplied = selectedVehicles.length > 0 || Boolean(category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border rounded-2xl shadow-elevated p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {editingItem ? (
              <Edit className="h-5 w-5 text-primary" />
            ) : (
              <Plus className="h-5 w-5 text-primary" />
            )}
            {editingItem
              ? isRu
                ? "Редактировать поступление"
                : "Kirimni tahrirlash"
              : isRu
                ? "Новое поступление товара"
                : "Yangi tovar kirimi"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. Viloyat / Hudud tanlash */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>{isRu ? "Регион поставок (Область)" : "Viloyat / Kirim hududi"} *</span>
              <span className="text-[11px] font-normal text-primary">
                {isRu ? "Для сравнения цен" : "Narxlarni taqqoslash uchun"}
              </span>
            </Label>
            <div className="mt-1">
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="w-full h-10">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <SelectValue
                      placeholder={
                        isRu
                          ? "Выберите регион (Андижан, Ташкент...)"
                          : "Viloyatni tanlang (Andijon, Toshkent...)"
                      }
                    />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {incomingCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 2. Mos keladigan avtomobillar */}
          <IncomingVehiclePicker
            vehicleBrands={effectiveVehicleBrands}
            selectedVehicles={selectedVehicles}
            onChange={setSelectedVehicles}
            isRu={isRu}
          />

          {/* 3. Kategoriya */}
          <IncomingCategoryPicker
            categories={allCategories}
            category={category}
            onChange={setCategory}
            isRu={isRu}
          />

          {/* 4. Tovar (Mahsulot) tanlash yoki yangi kiritish */}
          <IncomingProductCombobox
            products={products}
            filteredProducts={filteredProducts}
            productId={productId}
            productCustomName={productCustomName}
            hasFiltersApplied={hasFiltersApplied}
            onSelectProduct={handleProductSelect}
            onSetCustomName={(name) => {
              setProductCustomName(name);
              setProductId("");
            }}
            isRu={isRu}
          />

          {/* LIVE REGIONAL PRICE COMPARISON CALLOUT */}
          <IncomingLiveComparison comparison={liveProductComparison} isRu={isRu} />

          {/* Qty & Price */}
          <IncomingPriceSection
            qty={qty}
            setQty={setQty}
            buyPrice={buyPrice}
            setBuyPrice={setBuyPrice}
            buyPriceUsd={buyPriceUsd}
            setBuyPriceUsd={setBuyPriceUsd}
            buyCurrency={buyCurrency}
            setBuyCurrency={setBuyCurrency}
            usdRate={usdRate}
            isRu={isRu}
          />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRu ? "Отмена" : "Bekor qilish"}
          </Button>
          <Button onClick={handleSubmit}>{isRu ? "Сохранить" : "Saqlash"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
