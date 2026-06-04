import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, 
  Banknote, Sparkles, CheckCircle2, Printer, X, PackageOpen, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { formatSom } from "@/lib/constants";
import type { Product } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/pos")({
  component: PosPage,
});

interface CartItem {
  product: Product;
  qty: number;
  price: number; // sellPrice
}

function PosPage() {
  const t = useT();
  const { products, addSale, user } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<"Naqd" | "Karta">("Naqd");
  
  // Checkout Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount and keep focused
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filter products based on search query (name, SKU, or barcode)
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return p.quantity > 0; // Only show in-stock products by default
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  });

  // Handle direct barcode scanner input simulation
  // If the query matches a product barcode EXACTLY, add it to the cart and clear the search
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 4) {
      const match = products.find(p => p.barcode === trimmedQuery && p.quantity > 0);
      if (match) {
        addToCart(match);
        setSearchQuery("");
        toast.success(`${match.name} ${t("pos.added")}`);
      }
    }
  }, [searchQuery, products]);

  const addToCart = (product: Product) => {
    // Check stock
    const existing = cart.find(item => item.product.id === product.id);
    const currentQty = existing ? existing.qty : 0;
    
    if (currentQty >= product.quantity) {
      toast.error(`${product.name} - zaxirada yetarli emas (${product.quantity} ta mavjud)`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setCart([...cart, { product, qty: 1, price: product.sellPrice }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQty = (productId: string, delta: number) => {
    const item = cart.find(x => x.product.id === productId);
    if (!item) return;

    const nextQty = item.qty + delta;
    if (nextQty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (nextQty > item.product.quantity) {
      toast.error(`Zaxirada faqat ${item.product.quantity} ta mahsulot bor`);
      return;
    }

    setCart(cart.map(x => x.product.id === productId ? { ...x, qty: nextQty } : x));
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const cartTotal = Math.max(0, cartSubtotal - discount);
  const cartTotalProfit = cart.reduce((sum, item) => {
    const buyPrice = item.product.buyPrice || 0;
    const profitPerUnit = item.price - buyPrice;
    return sum + (item.qty * profitPerUnit);
  }, 0) - discount;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error(t("pos.emptyCart"));
      return;
    }

    const saleId = `sl_${Math.random().toString(36).slice(2, 9)}`;
    const saleData = {
      id: saleId,
      date: new Date().toISOString(),
      customerId: null,
      sellerId: user?.id || "system",
      items: cart.map(item => ({
        productId: item.product.id,
        qty: item.qty,
        price: item.price,
        buyPrice: item.product.buyPrice
      })),
      discount,
      paymentType,
      total: cartTotal,
      profit: cartTotalProfit
    };

    try {
      addSale(saleData);
      setLastSale({
        ...saleData,
        itemsDetail: cart
      });
      setShowReceipt(true);
      setCart([]);
      setDiscount(0);
      toast.success(t("pos.complete"));
    } catch (err) {
      toast.error("Xatolik yuz berdi");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-80px)] overflow-hidden">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 bg-card p-4 rounded-xl border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            {t("pos.title")}
          </h1>
          <p className="text-xs text-muted-foreground">{t("pos.subtitle")}</p>
        </div>
        
        {/* Search input with barcode indicator */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder={`${t("pos.scan")}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-24 bg-muted/40 border-muted focus-visible:ring-primary focus-visible:bg-background"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1.5 pointer-events-none">
            <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground border">Ctrl</kbd>
            <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground border">K</kbd>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Catalog (Left side) */}
        <div className="lg:col-span-8 flex flex-col min-h-0 bg-card border rounded-xl p-4">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
              Mahsulotlar ({filteredProducts.length})
            </h3>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="text-xs h-7 px-2">
                Filtrni tozalash
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <PackageOpen className="h-16 w-16 text-muted-foreground opacity-50 mb-3" />
                <h4 className="text-sm font-medium text-foreground">Tovar topilmadi</h4>
                <p className="text-xs text-muted-foreground mt-1">Boshqa nom yoki shtrix-kod kiriting</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-1">
                {filteredProducts.map(p => {
                  const inCart = cart.find(item => item.product.id === p.id);
                  const isOutOfStock = p.quantity <= 0;
                  
                  return (
                    <button
                      key={p.id}
                      disabled={isOutOfStock}
                      onClick={() => addToCart(p)}
                      className={`relative flex flex-col items-start text-left p-3 rounded-lg border bg-card hover:bg-muted/40 hover:border-primary/40 transition group ${
                        isOutOfStock ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                      } ${inCart ? "border-primary bg-primary/5 ring-1 ring-primary/20" : ""}`}
                    >
                      {/* Product Name */}
                      <span className="font-semibold text-sm group-hover:text-primary transition line-clamp-1 w-full">
                        {p.name}
                      </span>
                      
                      {/* Subtitle / Brand */}
                      <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 w-full">
                        {p.vehicle || "Universal"} • {p.category || "Boshqa"}
                      </span>

                      {/* Stock Info */}
                      <div className="flex justify-between items-center w-full mt-3 pt-2 border-t border-muted">
                        <span className="text-xs font-bold text-foreground">
                          {formatSom(p.sellPrice)}
                        </span>
                        
                        <Badge 
                          variant={isOutOfStock ? "destructive" : p.quantity <= p.minQty ? "warning" : "secondary"} 
                          className="text-[10px] px-1.5 py-0"
                        >
                          {isOutOfStock ? "Tugagan" : `${p.quantity} ta`}
                        </Badge>
                      </div>

                      {/* Cart badge indicator */}
                      {inCart && (
                        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full grid place-items-center shadow">
                          {inCart.qty}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Cart (Right side) */}
        <div className="lg:col-span-4 flex flex-col min-h-0 bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b shrink-0">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">{t("pos.cart")}</h3>
            {cart.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {cart.reduce((sum, i) => sum + i.qty, 0)} ta
              </Badge>
            )}
          </div>

          {/* Cart list */}
          <ScrollArea className="flex-1 min-h-0 mb-4 pr-1">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center h-[200px]">
                <ShoppingCart className="h-10 w-10 text-muted-foreground opacity-30 mb-2" />
                <span className="text-xs text-muted-foreground">{t("pos.emptyCart")}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-muted/50 text-xs">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="font-semibold truncate text-foreground">{item.product.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatSom(item.price)} / dona
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0 bg-background border rounded-md p-0.5">
                      <button 
                        onClick={() => updateQty(item.product.id, -1)}
                        className="h-5 w-5 rounded-md hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground transition"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-bold text-center min-w-[20px] text-xs">
                        {item.qty}
                      </span>
                      <button 
                        onClick={() => updateQty(item.product.id, 1)}
                        className="h-5 w-5 rounded-md hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground transition"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Delete button */}
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="ml-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md grid place-items-center transition shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Payment Details */}
          <div className="mt-auto border-t pt-4 shrink-0 flex flex-col gap-3.5">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Katalog jami:</span>
              <span className="font-medium text-foreground">{formatSom(cartSubtotal)}</span>
            </div>

            {/* Discount input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0 w-20">{t("pos.discount")}:</span>
              <Input
                type="number"
                min="0"
                max={cartSubtotal}
                value={discount || ""}
                onChange={(e) => setDiscount(Math.min(cartSubtotal, Number(e.target.value) || 0))}
                className="h-8 text-xs bg-muted/40"
                placeholder="So'm"
              />
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setPaymentType("Naqd")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition ${
                  paymentType === "Naqd" 
                    ? "bg-primary/10 border-primary text-primary shadow-sm" 
                    : "bg-background hover:bg-muted/40"
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                {t("pos.cash")}
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("Karta")}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition ${
                  paymentType === "Karta" 
                    ? "bg-primary/10 border-primary text-primary shadow-sm" 
                    : "bg-background hover:bg-muted/40"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                {t("pos.card")}
              </button>
            </div>

            {/* Total price */}
            <div className="flex justify-between items-center border-t border-dashed pt-3.5 mt-1">
              <span className="font-bold text-sm text-foreground">Jami summa:</span>
              <span className="font-black text-lg text-primary">{formatSom(cartTotal)}</span>
            </div>

            {/* Checkout Button */}
            <Button 
              size="lg" 
              onClick={handleCheckout} 
              disabled={cart.length === 0}
              className="w-full font-bold text-sm h-11 shadow-md hover:shadow-lg transition mt-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t("pos.checkout")}
            </Button>
          </div>
        </div>

      </div>

      {/* Receipt Modal (Overlay) */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in no-print">
          <div className="bg-card w-full max-w-sm rounded-xl border shadow-2xl p-6 flex flex-col gap-4 relative">
            <button 
              onClick={() => setShowReceipt(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-muted transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-1.5 pb-2 border-b">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <h2 className="font-bold text-base mt-1">{t("pos.complete")}</h2>
              <span className="text-xs text-muted-foreground">Sale ID: {lastSale.id}</span>
            </div>

            {/* Print receipt template */}
            <div className="bg-muted/30 border border-muted p-4 rounded-lg font-mono text-[11px] text-foreground flex flex-col gap-2 print:border-none print:bg-white print:p-0">
              <div className="text-center font-bold uppercase tracking-wider text-xs mb-1">
                AutoERP Pro Receipt
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Sana:</span>
                <span>{new Date(lastSale.date).toLocaleString("uz-UZ")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Kassir:</span>
                <span>{user?.name}</span>
              </div>
              <div className="flex justify-between text-muted-foreground mb-1">
                <span>To'lov turi:</span>
                <span>{lastSale.paymentType}</span>
              </div>
              
              <div className="border-t border-dashed my-1" />
              
              <div className="flex flex-col gap-1.5">
                {lastSale.itemsDetail?.map((item: any) => (
                  <div key={item.product.id} className="flex justify-between">
                    <span className="flex-1 truncate mr-2">{item.product.name}</span>
                    <span className="shrink-0">{item.qty} x {formatSom(item.price)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-dashed my-1" />

              {lastSale.discount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Chegirma:</span>
                  <span>-{formatSom(lastSale.discount)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-xs mt-1 text-foreground">
                <span>Jami summa:</span>
                <span>{formatSom(lastSale.total)}</span>
              </div>

              <div className="text-center text-muted-foreground mt-4 text-[10px]">
                Xaridingiz uchun rahmat!
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <Button variant="outline" size="sm" onClick={handlePrint} className="h-10 text-xs">
                <Printer className="h-3.5 w-3.5 mr-2" />
                Chop etish
              </Button>
              <Button size="sm" onClick={() => setShowReceipt(false)} className="h-10 text-xs font-semibold">
                Yopish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden iframe or styles for print formatting */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-receipt-only, .print-receipt-only * {
            visibility: visible;
          }
          .print-receipt-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
