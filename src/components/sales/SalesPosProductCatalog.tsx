import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Car, Layers, LayoutList, LayoutGrid, Package, Plus } from "lucide-react";
import { formatSom } from "@/lib/constants";
import { useLang } from "@/lib/i18n";
import type { Product } from "@/lib/types";
import type { CartItem } from "./SalesPosView";

interface SalesPosProductCatalogProps {
  search: string;
  setSearch: (s: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  selectedVehicle: string;
  setSelectedVehicle: (v: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  viewMode: "list" | "grid";
  setViewMode: (m: "list" | "grid") => void;
  vehicleBrands: string[];
  categories: string[];
  filteredProducts: Product[];
  cart: CartItem[];
  addToCart: (p: Product) => void;
}

export function SalesPosProductCatalog({
  search,
  setSearch,
  searchInputRef,
  onSearchKeyDown,
  selectedVehicle,
  setSelectedVehicle,
  selectedCategory,
  setSelectedCategory,
  viewMode,
  setViewMode,
  vehicleBrands,
  categories,
  filteredProducts,
  cart,
  addToCart,
}: SalesPosProductCatalogProps) {
  const { lang } = useLang();

  return (
    <div className="space-y-4">
      {/* Search & Barcode Header */}
      <Card className="p-4 rounded-2xl border-border/70 shadow-sm bg-card/70 backdrop-blur-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder={lang === "ru" ? "Поиск..." : "Qidirish..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="pl-11 pr-10 h-12 text-sm bg-background/90 rounded-xl border-border/80 focus-visible:ring-primary shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="flex items-center gap-1.5 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/60">
            <Car className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="h-7 border-0 bg-transparent shadow-none p-0 focus:ring-0 text-xs font-medium">
                <SelectValue placeholder={lang === "ru" ? "Марка авто" : "Mashina brendi"} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">
                  {lang === "ru" ? "Все автомобили" : "Barcha mashinalar"}
                </SelectItem>
                {vehicleBrands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/60">
            <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-7 border-0 bg-transparent shadow-none p-0 focus:ring-0 text-xs font-medium">
                <SelectValue placeholder={lang === "ru" ? "Категория" : "Kategoriya"} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">
                  {lang === "ru" ? "Все категории" : "Barcha kategoriyalar"}
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Product Cards / List View */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {lang === "ru" ? "Найдено товаров:" : "Topilgan mahsulotlar:"}{" "}
            <strong className="text-foreground">{filteredProducts.length}</strong>{" "}
            {lang === "ru" ? "шт." : "ta"}
          </span>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={lang === "ru" ? "Вид списком" : "Ro'yxat shaklida ko'rish"}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>{lang === "ru" ? "Список" : "Ro'yxat"}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={lang === "ru" ? "Вид сеткой" : "Kataklar shaklida ko'rish"}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>{lang === "ru" ? "Сетка" : "Kataklar"}</span>
            </button>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <Card className="p-12 text-center border-dashed rounded-2xl">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h3 className="font-semibold text-sm text-foreground">
              {lang === "ru" ? "Товары не найдены" : "Hech qanday tovar topilmadi"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {lang === "ru"
                ? "Попробуйте изменить поисковый запрос или фильтры."
                : "Qidiruv so'zini yoki filtrlarni o'zgartirib ko'ring."}
            </p>
          </Card>
        ) : viewMode === "list" ? (
          /* ── RO'YXAT (LIST) SHAKLI ── */
          <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 pb-2">
            {filteredProducts.map((p) => {
              const inCart = cart.find((item) => item.productId === p.id);
              const isOutOfStock = p.quantity <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                    inCart
                      ? "bg-primary/5 border-primary shadow-xs ring-1 ring-primary/20"
                      : "bg-card border-border/70 hover:border-primary/50 hover:bg-muted/30"
                  } ${isOutOfStock ? "opacity-50 cursor-not-allowed bg-muted/20" : ""}`}
                >
                  {/* Left: Product identification */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="shrink-0">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                          inCart
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        }`}
                      >
                        {inCart ? `${inCart.qty}x` : <Package className="h-4 w-4" />}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-medium bg-muted/60 shrink-0"
                        >
                          {p.vehicle || "Universal"}
                        </Badge>
                        {p.category && (
                          <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                            {p.category}
                          </span>
                        )}
                        {p.barcode && (
                          <span className="text-[10px] font-mono text-muted-foreground/70 hidden md:inline">
                            #{p.barcode}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate mt-0.5 group-hover:text-primary transition-colors">
                        {p.name}
                      </h4>
                    </div>
                  </div>

                  {/* Right: Warehouse Stock & Price */}
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block">
                        {isOutOfStock ? (
                          <span className="text-destructive font-semibold">
                            {lang === "ru" ? "Нет в наличии" : "Tugagan"}
                          </span>
                        ) : (
                          <span>
                            {lang === "ru" ? "Остаток:" : "Qoldiq:"}{" "}
                            <strong className="text-foreground">{p.quantity}</strong>{" "}
                            {lang === "ru" ? "шт." : "ta"}
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-foreground tabular-nums">
                        {formatSom(p.sellPrice)}
                      </span>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant={inCart ? "default" : "outline"}
                      disabled={isOutOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p);
                      }}
                      className="h-8 w-8 rounded-lg shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── KATAKLAR (GRID) SHAKLI ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 pb-2">
            {filteredProducts.map((p) => {
              const inCart = cart.find((item) => item.productId === p.id);
              const isOutOfStock = p.quantity <= 0;

              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={isOutOfStock}
                  type="button"
                  className={`group relative text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    inCart
                      ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                      : "bg-card border-border/70 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
                  } ${isOutOfStock ? "opacity-50 cursor-not-allowed bg-muted/40" : ""}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 font-normal bg-muted/60 truncate max-w-[100px]"
                      >
                        {p.vehicle || "Universal"}
                      </Badge>
                      {inCart && (
                        <Badge className="h-5 px-1.5 text-[10px] font-bold bg-primary text-primary-foreground">
                          {inCart.qty} {lang === "ru" ? "шт." : "ta"}
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-semibold text-xs text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {p.name}
                    </h4>

                    {p.barcode && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">
                        #{p.barcode}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/50 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        {isOutOfStock ? (
                          <span className="text-destructive font-medium">
                            {lang === "ru" ? "Нет в наличии" : "Tugagan"}
                          </span>
                        ) : (
                          <span>
                            {lang === "ru" ? "Остаток:" : "Qoldiq:"} {p.quantity}{" "}
                            {lang === "ru" ? "шт." : "ta"}
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-foreground tabular-nums">
                        {formatSom(p.sellPrice)}
                      </span>
                    </div>
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                        inCart
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground"
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
