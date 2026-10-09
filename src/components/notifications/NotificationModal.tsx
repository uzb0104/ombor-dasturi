import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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
import {
  Bell,
  Search,
  AlertTriangle,
  XCircle,
  Package,
  Car,
  PackagePlus,
  ExternalLink,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { useT, useLang } from "@/lib/i18n";
import type { Product } from "@/lib/types";

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onNavigate: (path: string) => void;
}

type FilterStatus = "all" | "out" | "low";

export function NotificationModal({
  open,
  onOpenChange,
  products,
  onNavigate,
}: NotificationModalProps) {
  const t = useT();
  const { lang } = useLang();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const productList = useMemo(() => (Array.isArray(products) ? products : []), [products]);

  // Out of stock and Low stock items
  const outStock = useMemo(() => productList.filter((p) => p.quantity === 0), [productList]);

  const lowStock = useMemo(
    () => productList.filter((p) => p.quantity > 0 && p.quantity <= (p.minQty ?? 5)),
    [productList],
  );

  const allAlertProducts = useMemo(() => [...outStock, ...lowStock], [outStock, lowStock]);

  // Categories list for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    allAlertProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAlertProducts]);

  // Filtered products based on search, status filter and category
  const filteredProducts = useMemo(() => {
    return allAlertProducts.filter((p) => {
      const minThreshold = p.minQty ?? 5;
      // Status filter
      if (statusFilter === "out" && p.quantity !== 0) return false;
      if (statusFilter === "low" && (p.quantity === 0 || p.quantity > minThreshold)) return false;

      // Category filter
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const vehicles = Array.isArray(p.vehicles) ? p.vehicles.join(" ") : p.vehicle || "";
        const nameMatch = p.name.toLowerCase().includes(query);
        const vehicleMatch = vehicles.toLowerCase().includes(query);
        const categoryMatch = (p.category || "").toLowerCase().includes(query);
        const skuMatch = (p.sku || "").toLowerCase().includes(query);
        const barcodeMatch = (p.barcode || "").toLowerCase().includes(query);

        return nameMatch || vehicleMatch || categoryMatch || skuMatch || barcodeMatch;
      }

      return true;
    });
  }, [allAlertProducts, statusFilter, categoryFilter, search]);

  const handleAction = (path: string) => {
    onOpenChange(false);
    onNavigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border bg-background">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-destructive/10 text-destructive">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {lang === "ru"
                    ? "Уведомления и остатки"
                    : "Bildirishnomalar va tovarlar ogahlantirishi"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ru"
                    ? `Всего ${allAlertProducts.length} товаров требуют внимания (${outStock.length} отсутствуют, ${lowStock.length} заканчиваются)`
                    : `Jami ${allAlertProducts.length} ta tovar e'tibor talab qiladi (${outStock.length} ta tugagan, ${lowStock.length} ta kam qolgan)`}
                </DialogDescription>
              </div>
            </div>

            {/* Quick Metrics Badges */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                <span>{lang === "ru" ? "Все" : "Barchasi"}</span>
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 h-4 text-[10px] bg-background/20 text-current"
                >
                  {allAlertProducts.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("out")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === "out"
                    ? "bg-destructive text-destructive-foreground shadow-sm"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                }`}
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>{lang === "ru" ? "Закончились" : "Tugagan"}</span>
                <Badge className="px-1.5 py-0 h-4 text-[10px] bg-destructive-foreground/20 text-current">
                  {outStock.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("low")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === "low"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{lang === "ru" ? "Заканчиваются" : "Kam qolgan"}</span>
                <Badge className="px-1.5 py-0 h-4 text-[10px] bg-white/20 text-current">
                  {lowStock.length}
                </Badge>
              </button>
            </div>
          </div>

          {/* Search & Filters Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  lang === "ru"
                    ? "Поиск по авто, названию, категории или штрихкоду..."
                    : "Moshina nomi, tovar nomi, kategoriya yoki barkod bo'yicha qidirish..."
                }
                className="pl-9 h-9 bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 min-w-[160px] bg-background">
                  <div className="flex items-center gap-2 truncate">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <SelectValue placeholder={lang === "ru" ? "Категория" : "Kategoriya"} />
                  </div>
                </SelectTrigger>
                <SelectContent>
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
        </DialogHeader>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {allAlertProducts.length === 0 ? (
                <>
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-3">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-base font-semibold">
                    {lang === "ru"
                      ? "Все товары в достаточном количестве!"
                      : "Barcha tovarlar omborda yetarli miqdorda!"}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    {lang === "ru"
                      ? "В данный момент нет товаров с нулевым остатком или ниже минимального порога."
                      : "Hozirda tugagan yoki minimal ko'rsatkichdan kam qolgan tovarlar mavjud emas."}
                  </p>
                </>
              ) : (
                <>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground mb-3">
                    <Package className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold">
                    {lang === "ru" ? "Ничего не найдено" : "Qidiruv bo'yicha hech narsa topilmadi"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === "ru"
                      ? "Попробуйте изменить параметры поиска или сбросить фильтры."
                      : "Qidiruv so'zini o'zgartiring yoki filtrlarni tozalang."}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12 text-center">№</TableHead>
                    <TableHead className="min-w-[140px]">
                      <div className="flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{lang === "ru" ? "Марка машины" : "Moshina nomi"}</span>
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{lang === "ru" ? "Наименование товара" : "Tovar nomi"}</span>
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[130px]">
                      {lang === "ru" ? "Категория" : "Kategoriya"}
                    </TableHead>
                    <TableHead className="text-center min-w-[120px]">
                      {lang === "ru" ? "Остаток" : "Nechta qolganligi"}
                    </TableHead>
                    <TableHead className="text-center min-w-[110px]">
                      {lang === "ru" ? "Статус" : "Holati"}
                    </TableHead>
                    <TableHead className="text-right min-w-[120px]">
                      {lang === "ru" ? "Действие" : "Amal"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((p, idx) => {
                    const isOut = p.quantity === 0;
                    const vehicles =
                      Array.isArray(p.vehicles) && p.vehicles.length > 0
                        ? p.vehicles.join(", ")
                        : p.vehicle || "—";

                    return (
                      <TableRow key={p.id} className="hover:bg-muted/40 transition">
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>

                        {/* Moshina nomi */}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                              {vehicles}
                            </span>
                          </div>
                        </TableCell>

                        {/* Tovar nomi */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm leading-snug">{p.name}</span>
                            {(p.sku || p.barcode) && (
                              <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                {p.sku && `SKU: ${p.sku}`} {p.barcode && `| Barcode: ${p.barcode}`}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Kategoriyasi */}
                        <TableCell>
                          <Badge variant="outline" className="font-normal text-xs bg-background">
                            {p.category || "—"}
                          </Badge>
                        </TableCell>

                        {/* Nechta qolganligi */}
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span
                              className={`font-bold text-sm tabular-nums ${
                                isOut ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {p.quantity} {t("common.pcs")}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              (Min: {p.minQty ?? 5} {t("common.pcs")})
                            </span>
                          </div>
                        </TableCell>

                        {/* Holati */}
                        <TableCell className="text-center">
                          {isOut ? (
                            <Badge
                              variant="destructive"
                              className="gap-1 font-medium text-[11px] px-2 py-0.5"
                            >
                              <XCircle className="h-3 w-3" />
                              <span>{lang === "ru" ? "Закончился" : "Tugagan"}</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="gap-1 font-medium text-[11px] px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              <span>{lang === "ru" ? "Kam qolgan" : "Kam qoldi"}</span>
                            </Badge>
                          )}
                        </TableCell>

                        {/* Amallar */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs border-primary/30 hover:bg-primary hover:text-primary-foreground"
                              onClick={() => handleAction("/incoming")}
                              title={
                                lang === "ru" ? "Оформить приход товара" : "Tovar kirimi qilish"
                              }
                            >
                              <PackagePlus className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">
                                {lang === "ru" ? "Приход" : "Kirim"}
                              </span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">
            {lang === "ru"
              ? `Показано ${filteredProducts.length} из ${allAlertProducts.length} товаров`
              : `${allAlertProducts.length} ta ogahlantirishdan ${filteredProducts.length} tasi ko'rsatilmoqda`}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("/products")}
              className="gap-1.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{lang === "ru" ? "Перейти к товарам" : "Barcha tovarlarga o'tish"}</span>
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              {lang === "ru" ? "Закрыть" : "Yopish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
