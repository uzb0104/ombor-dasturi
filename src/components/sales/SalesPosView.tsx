import { useState, useMemo, useRef, useEffect } from "react";
import { formatSom } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import type { Product, Sale, Customer } from "@/lib/types";
import { ReceiptModal } from "./ReceiptModal";
import { SalesPosDebtDialog } from "./SalesPosDebtDialog";
import { SalesPosProductCatalog } from "./SalesPosProductCatalog";
import { SalesPosCart } from "./SalesPosCart";
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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      const q = search.trim().toLowerCase();
      const exactBarcode = products.find((p) => p.barcode && p.barcode.toLowerCase() === q);
      if (exactBarcode) {
        addToCart(exactBarcode);
        setSearch("");
        return;
      }

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

  const handleConfirmDebtSale = () => {
    if (cart.length === 0) {
      toast.error(lang === "ru" ? "Корзина пуста!" : "Savat bo'sh!");
      return;
    }

    let targetCustId = "";

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
      const newCust: Customer = {
        id: targetCustId,
        name: newDebtCustName.trim(),
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
      <div className="lg:col-span-7">
        <SalesPosProductCatalog
          search={search}
          setSearch={setSearch}
          searchInputRef={searchInputRef}
          onSearchKeyDown={handleSearchKeyDown}
          selectedVehicle={selectedVehicle}
          setSelectedVehicle={setSelectedVehicle}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          viewMode={viewMode}
          setViewMode={setViewMode}
          vehicleBrands={vehicleBrands}
          categories={categories}
          filteredProducts={filteredProducts}
          cart={cart}
          addToCart={addToCart}
        />
      </div>

      {/* ──────────────── RIGHT PANEL: ACTIVE CART & CHECKOUT (5 COLS) ──────────────── */}
      <div className="lg:col-span-5">
        <SalesPosCart
          cart={cart}
          subtotal={subtotal}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          updateItemQty={updateItemQty}
          setItemExactQty={setItemExactQty}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
          onOpenDebtDialog={handleOpenDebtDialog}
          onCheckout={handleCheckout}
        />
      </div>

      {/* ──────────────── DIALOG: QARZGA SOTUV ──────────────── */}
      <SalesPosDebtDialog
        open={debtDialogOpen}
        onOpenChange={setDebtDialogOpen}
        subtotal={subtotal}
        cartCount={cart.length}
        customers={customers}
        customerMode={customerMode}
        setCustomerMode={setCustomerMode}
        selectedDebtCustId={selectedDebtCustId}
        setSelectedDebtCustId={setSelectedDebtCustId}
        selectedDebtCust={selectedDebtCust}
        newDebtCustName={newDebtCustName}
        setNewDebtCustName={setNewDebtCustName}
        newDebtCustPhone={newDebtCustPhone}
        setNewDebtCustPhone={setNewDebtCustPhone}
        debtInitialPaid={debtInitialPaid}
        setDebtInitialPaid={setDebtInitialPaid}
        onConfirm={handleConfirmDebtSale}
      />

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
