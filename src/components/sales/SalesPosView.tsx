import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Receipt,
  Car,
  Package,
  Layers,
  LayoutList,
  LayoutGrid,
  HandCoins,
  User,
  Check,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatSom } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { useT, useLang } from "@/lib/i18n";
import type { Product, Sale, Customer } from "@/lib/types";
import { ReceiptModal } from "./ReceiptModal";
import { toast } from "sonner";

export interface CartItem {
  productId: string;
  productName: string;
  vehicle: string;
  category: string;
  availableStock: number;
  qty: number;
  price: number;
  buyPrice: number;
}

export function SalesPosView() {
  const t = useT();
  const { lang } = useLang();
  const { products, customers, addCustomer, employees, user, vehicleBrands, categories, addSale } =
    useStore();

  // Search & Filters
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentType, setPaymentType] = useState<"Naqd" | "Karta" | "O'tkazma">("Naqd");

  // Debt Sale Dialog State
  const [debtDialogOpen, setDebtDialogOpen] = useState(false);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [selectedDebtCustId, setSelectedDebtCustId] = useState<string>("");
  const [newDebtCustName, setNewDebtCustName] = useState("");
  const [newDebtCustPhone, setNewDebtCustPhone] = useState("");
  const [debtInitialPaid, setDebtInitialPaid] = useState<number>(0);

  // Dialogs
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Auto focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchVeh =
        selectedVehicle === "all" ||
        p.vehicle === selectedVehicle ||
        (p.vehicles && p.vehicles.includes(selectedVehicle)) ||
        (p.vehicle && p.vehicle.includes(selectedVehicle)) ||
        p.vehicle === "Barchasi" ||
        p.vehicle === "Universal";

      const matchCat = selectedCategory === "all" || p.category === selectedCategory;

      if (!matchVeh || !matchCat) return false;

      if (!q) return true;

      const matchName = p.name.toLowerCase().includes(q);
      const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
      const matchSku = p.sku ? p.sku.toLowerCase().includes(q) : false;
      const matchBrand = p.vehicle ? p.vehicle.toLowerCase().includes(q) : false;

      return matchName || matchBarcode || matchSku || matchBrand;
    });
  }, [products, search, selectedVehicle, selectedCategory]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      toast.error(
        lang === "ru" ? `«${product.name}» нет на складе!` : `"${product.name}" omborda qolmagan!`,
      );
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.qty >= product.quantity) {
          toast.warning(
            lang === "ru"
              ? `На складе только ${product.quantity} шт.!`
              : `Omborda faqat ${product.quantity} ta mavjud!`,
          );
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          vehicle: String(product.vehicle || "Universal"),
          category: String(product.category || ""),
          availableStock: product.quantity,
          qty: 1,
          price: product.sellPrice,
          buyPrice: product.buyPrice || 0,
        },
      ];
    });

    toast.success(
      lang === "ru"
        ? `«${product.name}» добавлено в корзину`
        : `"${product.name}" savatga qo'shildi`,
      { duration: 1500 },
    );
  };

  // Handle barcode scanning or Enter in search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      const q = search.trim().toLowerCase();
      // Look for exact barcode first
      const exactBarcode = products.find((p) => p.barcode && p.barcode.toLowerCase() === q);
      if (exactBarcode) {
        addToCart(exactBarcode);
        setSearch("");
        return;
      }

      // If only 1 product matches filter, add it
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearch("");
        return;
      }
    }
  };

  const updateItemQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const nextQty = item.qty + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.availableStock) {
            toast.warning(
              lang === "ru"
                ? `На складе только ${item.availableStock} шт.!`
                : `Omborda faqat ${item.availableStock} ta mavjud!`,
            );
            return item;
          }
          return { ...item, qty: nextQty };
        })
        .filter((x): x is CartItem => x !== null),
    );
  };

  const setItemExactQty = (productId: string, rawVal: number) => {
    const qty = Math.max(1, Number(rawVal) || 1);
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        if (qty > item.availableStock) {
          toast.warning(
            lang === "ru"
              ? `На складе только ${item.availableStock} шт.!`
              : `Omborda faqat ${item.availableStock} ta mavjud!`,
          );
          return { ...item, qty: item.availableStock };
        }
        return { ...item, qty };
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    searchInputRef.current?.focus();
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  }, [cart]);

  const totalProfit = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price - item.buyPrice) * item.qty, 0);
  }, [cart]);

  // Submit Sale
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error(
        lang === "ru"
          ? "Корзина пуста! Добавьте хотя бы один товар."
          : "Savat bo'sh! Kamida bitta mahsulot qo'shing.",
      );
      return;
    }

    const seller =
      employees.find((e) => e.id === user?.id) ||
      employees.find((e) => e.role === "Sotuvchi") ||
      employees[0];

    const salePayload: Sale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      customerId: null,
      sellerId: seller?.id || "",
      vehicle: selectedVehicle !== "all" ? selectedVehicle : "",
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        price: item.price,
        buyPrice: item.buyPrice,
      })),
      discount: 0,
      paymentType,
      total: subtotal,
      profit: totalProfit,
      paid: subtotal,
    };

    addSale(salePayload);
    setLastSale(salePayload);
    setReceiptOpen(true);
    clearCart();
    toast.success(
      lang === "ru" ? "Продажа успешно завершена!" : "Savdo muvaffaqiyatli yakunlandi!",
    );
  };

  // Selected existing debt customer
  const selectedDebtCust = useMemo(() => {
    return customers.find((c) => c.id === selectedDebtCustId) || null;
  }, [customers, selectedDebtCustId]);

  // Debt Sale Open Handler
  const handleOpenDebtDialog = () => {
    setDebtInitialPaid(0);
    const hasCustomers = customers.length > 0;
    setCustomerMode(hasCustomers ? "existing" : "new");
    if (hasCustomers) {
      setSelectedDebtCustId(customers[0].id);
    } else {
      setSelectedDebtCustId("");
    }
    setNewDebtCustName("");
    setNewDebtCustPhone("");
    setDebtDialogOpen(true);
  };

  // Debt Sale Confirm Handler (Debts sahifasi bilan integratsiya)
  const handleConfirmDebtSale = () => {
    if (cart.length === 0) {
      toast.error(lang === "ru" ? "Корзина пуста!" : "Savat bo'sh!");
      return;
    }

    let targetCustId = "";
    let targetCustName = "";

    if (customerMode === "existing") {
      if (!selectedDebtCustId) {
        toast.error(
          lang === "ru"
            ? "Пожалуйста, выберите клиента из списка!"
            : "Iltimos, ro'yxatdan mijozni tanlang!",
        );
        return;
      }
      const found = customers.find((c) => c.id === selectedDebtCustId);
      if (!found) {
        toast.error(lang === "ru" ? "Выбранный клиент не найден!" : "Tanlangan mijoz topilmadi!");
        return;
      }
      targetCustId = found.id;
      targetCustName = found.name;
    } else {
      if (!newDebtCustName.trim()) {
        toast.error(
          lang === "ru"
            ? "Пожалуйста, введите имя нового клиента!"
            : "Iltimos, yangi mijoz ismini kiriting!",
        );
        return;
      }
      targetCustId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      targetCustName = newDebtCustName.trim();
      const newCust: Customer = {
        id: targetCustId,
        name: targetCustName,
        phone: newDebtCustPhone.trim(),
        address: "",
        vehicle: selectedVehicle !== "all" ? selectedVehicle : "",
        totalPurchases: 0,
        debt: 0,
      };
      addCustomer(newCust);
    }

    const seller =
      employees.find((e) => e.id === user?.id) ||
      employees.find((e) => e.role === "Sotuvchi") ||
      employees[0];

    const paidVal = Math.min(subtotal, Math.max(0, Number(debtInitialPaid) || 0));
    const remainingDebt = Math.max(0, subtotal - paidVal);

    const salePayload: Sale = {
      id: `sale_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      customerId: targetCustId,
      sellerId: seller?.id || "",
      vehicle: selectedVehicle !== "all" ? selectedVehicle : "",
      items: cart.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        qty: item.qty,
        price: item.price,
        buyPrice: item.buyPrice,
      })),
      discount: 0,
      paymentType: "Qarz",
      total: subtotal,
      profit: totalProfit,
      paid: paidVal,
    };

    addSale(salePayload);
    setLastSale(salePayload);
    setReceiptOpen(true);
    clearCart();
    setDebtDialogOpen(false);
    toast.success(
      lang === "ru"
        ? `Продажа в долг оформлена! ${formatSom(remainingDebt)} добавлено в раздел Задолженность.`
        : `Qarzga sotuv rasmiylashtirildi! ${formatSom(remainingDebt)} Qarzlar bo'limiga qo'shildi.`,
      { duration: 4000 },
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* ──────────────── LEFT PANEL: PRODUCT CATALOG (7 COLS) ──────────────── */}
      <div className="lg:col-span-7 space-y-4">
        {/* Search & Barcode Header */}
        <Card className="p-4 rounded-2xl border-border/70 shadow-sm bg-card/70 backdrop-blur-sm space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={lang === "ru" ? "Поиск..." : "Qidirish..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
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

            {/* View Mode Switcher (List is default) */}
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

      {/* ──────────────── RIGHT PANEL: ACTIVE CART & CHECKOUT (5 COLS) ──────────────── */}
      <div className="lg:col-span-5">
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
                onClick={handleOpenDebtDialog}
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
            {/* Payment Method Selector (Naqd, Karta, O'tkazma - No Qarz) */}
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
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full h-12 rounded-xl text-sm font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200"
            >
              <Banknote className="h-5 w-5 mr-2" />
              {lang === "ru" ? "Завершить продажу" : "Savdoni yakunlash"}
            </Button>
          </div>
        </Card>
      </div>

      {/* ──────────────── DIALOG: QARZGA SOTUV (DEBTS MOSLASHTIRILGAN) ──────────────── */}
      <Dialog open={debtDialogOpen} onOpenChange={setDebtDialogOpen}>
        <DialogContent className="max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <HandCoins className="h-4 w-4" />
              </div>
              {lang === "ru" ? "Оформление продажи в долг" : "Qarzga sotuv rasmiylashtirish"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Bo'sh savat ogohlantirishi */}
            {cart.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {lang === "ru"
                    ? "Корзина пока пуста! Выберите товары слева."
                    : "Savat hozircha bo'sh! Chap tarafdan tovarlarni tanlang."}
                </span>
              </div>
            )}

            {/* Savat summasi */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground block">
                  {lang === "ru" ? "Общая сумма покупки:" : "Jami xarid summasi:"}
                </span>
                <span className="text-base font-black text-foreground tabular-nums">
                  {formatSom(subtotal)}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {cart.length === 0
                  ? lang === "ru"
                    ? "Корзина пуста"
                    : "Savat bo'sh"
                  : `${cart.length} ${lang === "ru" ? "поз." : "xil tovar"}`}
              </Badge>
            </div>

            {/* Mijoz rejimi: Mavjud mijoz yoki Yangi mijoz */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                  {lang === "ru" ? "Клиент-должник" : "Qarzdor mijoz"}
                </Label>
                <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCustomerMode("existing")}
                    className={`px-2 py-0.5 rounded font-medium transition-all ${
                      customerMode === "existing"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lang === "ru" ? "Существующий клиент" : "Mavjud mijoz"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode("new")}
                    className={`px-2 py-0.5 rounded font-medium transition-all ${
                      customerMode === "new"
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lang === "ru" ? "+ Новый клиент" : "+ Yangi mijoz"}
                  </button>
                </div>
              </div>

              {customerMode === "existing" ? (
                <div className="space-y-1">
                  {customers.length === 0 ? (
                    <div className="p-3 rounded-xl border border-dashed border-border/80 text-xs text-muted-foreground text-center bg-muted/20">
                      {lang === "ru" ? (
                        <>
                          В базе нет клиентов. Нажмите кнопку выше{" "}
                          <strong className="text-foreground">+ Новый клиент</strong>.
                        </>
                      ) : (
                        <>
                          Bazada mijozlar mavjud emas. Yuqoridagi{" "}
                          <strong className="text-foreground">+ Yangi mijoz</strong> tugmasini
                          bosing.
                        </>
                      )}
                    </div>
                  ) : (
                    <Select value={selectedDebtCustId} onValueChange={setSelectedDebtCustId}>
                      <SelectTrigger className="h-10 text-xs bg-background">
                        <SelectValue
                          placeholder={lang === "ru" ? "Выберите клиента..." : "Mijozni tanlang..."}
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-56 z-[100]">
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} {c.phone ? `(${c.phone})` : ""}
                            {c.debt > 0
                              ? lang === "ru"
                                ? ` — Прежний долг: ${formatSom(c.debt)}`
                                : ` — Eskidan qarz: ${formatSom(c.debt)}`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedDebtCust && (
                    <div className="flex items-center justify-between text-[11px] px-1 pt-1 text-muted-foreground">
                      <span>
                        {lang === "ru" ? "Тел:" : "Tel:"}{" "}
                        {selectedDebtCust.phone || (lang === "ru" ? "нет" : "yo'q")}
                      </span>
                      {selectedDebtCust.debt > 0 && (
                        <span className="text-destructive font-semibold">
                          {lang === "ru" ? "Текущий долг:" : "Mavjud qarzi:"}{" "}
                          {formatSom(selectedDebtCust.debt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <Input
                      placeholder={
                        lang === "ru"
                          ? "Имя и фамилия клиента (например: Рустам Акрамов)"
                          : "Mijoz ismi va familiyasi (masalan: Rustam Akramov)"
                      }
                      value={newDebtCustName}
                      onChange={(e) => setNewDebtCustName(e.target.value)}
                      className="h-9 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <Input
                      placeholder={
                        lang === "ru"
                          ? "Номер телефона (например: +998 90 123 45 67)"
                          : "Telefon raqami (masalan: +998 90 123 45 67)"
                      }
                      value={newDebtCustPhone}
                      onChange={(e) => setNewDebtCustPhone(e.target.value)}
                      className="h-9 text-xs bg-background"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* To'lov taqsimoti */}
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-medium text-muted-foreground">
                    {lang === "ru" ? "Оплачивается сейчас (сум)" : "Hozir to'lanadi (so'm)"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={subtotal}
                    value={debtInitialPaid || ""}
                    placeholder="0"
                    onChange={(e) => setDebtInitialPaid(Math.max(0, Number(e.target.value)))}
                    className="h-9 text-xs bg-background mt-1 font-semibold tabular-nums"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    {lang === "ru" ? "Записывается в долг" : "Qarzga yoziladi"}
                  </span>
                  <div className="h-9 mt-1 flex items-center px-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs font-bold text-destructive tabular-nums">
                    {formatSom(Math.max(0, subtotal - (Number(debtInitialPaid) || 0)))}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                ℹ️{" "}
                {lang === "ru" ? (
                  <>
                    Этот долг автоматически поступит в раздел <strong>Задолженность</strong> и
                    запишется на клиента.
                  </>
                ) : (
                  <>
                    Ushbu qarz avtomatik ravishda <strong>Qarzlar</strong> bo'limiga tushadi va
                    mijoz hisobiga yoziladi.
                  </>
                )}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDebtDialogOpen(false)}
              className="text-xs"
            >
              {lang === "ru" ? "Отмена" : "Bekor qilish"}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDebtSale}
              disabled={cart.length === 0}
              className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            >
              <Check className="h-4 w-4 mr-1.5" />
              {cart.length === 0
                ? lang === "ru"
                  ? "Корзина пуста"
                  : "Savat bo'sh"
                : lang === "ru"
                  ? "Подтвердить продажу в долг"
                  : "Qarzga sotishni tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <ReceiptModal
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        sale={lastSale}
        isNewSaleSuccess={true}
        onNewSale={() => {
          searchInputRef.current?.focus();
        }}
      />
    </div>
  );
}
