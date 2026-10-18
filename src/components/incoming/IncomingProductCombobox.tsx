import React, { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface IncomingProductComboboxProps {
  products: Product[];
  filteredProducts: Product[];
  productId: string;
  productCustomName: string;
  hasFiltersApplied: boolean;
  onSelectProduct: (p: Product) => void;
  onSetCustomName: (name: string) => void;
  isRu: boolean;
}

export function IncomingProductCombobox({
  products,
  filteredProducts,
  productId,
  productCustomName,
  hasFiltersApplied,
  onSelectProduct,
  onSetCustomName,
  isRu,
}: IncomingProductComboboxProps) {
  const [productComboOpen, setProductComboOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  const baseList = hasFiltersApplied ? filteredProducts : products;

  // Custom search query filter that handles Uzbek characters and multi-field matching
  const matchingProducts = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const veh = (p.vehicle || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const cat = (p.category || "").toLowerCase();
      return name.includes(q) || veh.includes(q) || sku.includes(q) || cat.includes(q);
    });
  }, [baseList, productSearchQuery]);

  const handleSelectExisting = (p: Product) => {
    onSelectProduct(p);
    setProductComboOpen(false);
  };

  const handleSelectNewCustom = () => {
    onSetCustomName(productSearchQuery.trim());
    setProductComboOpen(false);
  };

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div>
      <Label className="text-xs font-semibold text-muted-foreground uppercase">
        {isRu ? "Товар (Наименование запчасти) *" : "Mahsulot (Tovar nomi) *"}
      </Label>
      <div className="mt-1">
        <Popover open={productComboOpen} onOpenChange={setProductComboOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={productComboOpen}
              className="w-full justify-between h-10 px-3 font-normal text-left"
            >
              <span className="truncate">
                {productCustomName ||
                  (selectedProduct
                    ? `${selectedProduct.name} (${selectedProduct.vehicle || "Universal"})`
                    : isRu
                      ? "Поиск или выбор товара..."
                      : "Tovarni qidirish yoki tanlash...")}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={
                  isRu
                    ? "Поиск или ввод нового товара..."
                    : "Tovar qidirish yoki yangi nom yozish..."
                }
                value={productSearchQuery}
                onValueChange={setProductSearchQuery}
              />
              <CommandList className="max-h-[260px] overflow-y-auto">
                {productSearchQuery.trim() &&
                  !products.some(
                    (p) => p.name.toLowerCase() === productSearchQuery.trim().toLowerCase(),
                  ) && (
                    <div className="p-2 border-b">
                      <button
                        type="button"
                        className="w-full text-left text-xs p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold flex items-center gap-1.5"
                        onClick={handleSelectNewCustom}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>
                          "{productSearchQuery.trim()}" —{" "}
                          {isRu ? "добавить как новый товар" : "yangi tovar sifatida tanlash"}
                        </span>
                      </button>
                    </div>
                  )}

                {matchingProducts.length === 0 ? (
                  <CommandEmpty>
                    <div className="py-4 px-3 text-center text-xs text-muted-foreground space-y-1">
                      <div>
                        {hasFiltersApplied
                          ? isRu
                            ? "По выбранной модели или категории товары не найдены."
                            : "Tanlangan mashina yoki kategoriya bo'yicha tovar topilmadi."
                          : isRu
                            ? "Товар не найден."
                            : "Tovar topilmadi."}
                      </div>
                      <div className="text-[11px] text-primary font-medium">
                        {isRu
                          ? "Введите название выше, чтобы создать новый товар."
                          : "Yangi tovar nomini yuqoriga yozib tanlashingiz mumkin."}
                      </div>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup
                    heading={
                      hasFiltersApplied
                        ? isRu
                          ? `Подходящие товары (${matchingProducts.length})`
                          : `Mos tovarlar (${matchingProducts.length} ta)`
                        : isRu
                          ? `Все товары (${matchingProducts.length})`
                          : `Barcha tovarlar (${matchingProducts.length} ta)`
                    }
                  >
                    {matchingProducts.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.id}
                        onSelect={() => handleSelectExisting(p)}
                        className="cursor-pointer hover:bg-accent/40 flex items-center justify-between py-2 px-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <Check
                            className={cn(
                              "h-4 w-4 text-primary shrink-0",
                              productId === p.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-foreground">{p.name}</span>
                            <span className="text-[11px] text-muted-foreground">
                              🚗 {p.vehicle || "Universal"} · {p.category || "Kategoriyasiz"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground font-semibold shrink-0 pl-2">
                          Omborda: {p.quantity} ta
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
