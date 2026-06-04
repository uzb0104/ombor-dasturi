import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard, useConfirm, usePagination, PaginationBar } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, ShoppingCart, TrendingUp, Printer, Download, CreditCard, UserPlus, Check, ChevronsUpDown, Trash2, Minus, FileDown, Edit } from "lucide-react";
import { useT } from "@/lib/i18n";
import { paymentLabel } from "@/lib/i18n/helpers";
import { downloadSaleReceiptPdf } from "@/lib/receipt-pdf";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/sales")({ component: SalesPage });

type Mode = "cash" | "credit";

type Form = {
  vehicle: string;
  discount: number;
  paymentType: "Naqd" | "Karta" | "Qarz";
  customerId: string; // existing customer id, or "" for new
  paidNow: number; // qarz sotuvda hozir naqd to'lanadigan qism
  // new customer fields (used when credit + no customer selected)
  custName: string;
  custPhone: string;
  custAddress: string;
};

type CartItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  buyPrice: number;
};

const emptyForm = (): Form => ({
  vehicle: "",
  discount: 0,
  paymentType: "Naqd",
  customerId: "",
  paidNow: 0,
  custName: "",
  custPhone: "",
  custAddress: "",
});

function SalesPage() {
  const t = useT();
  const { sales, customers, products, employees, vehicleBrands, addSale, updateSale, deleteSale, addCustomer } = useStore();
  const [period, setPeriod] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("cash");
  const [form, setForm] = useState<Form>(emptyForm());

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedPrice, setSelectedPrice] = useState(0);

  // Combobox open states
  const [productComboOpen, setProductComboOpen] = useState(false);
  const [custComboOpen, setCustComboOpen] = useState(false);

  // Selected sale for receipt dialog
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Confirm hook
  const { confirm, confirmNode } = useConfirm();

  const filtered = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const map: Record<string, number> = { today: 0, week: 7, month: 30 };
    if (period === "all") return sales;
    const days = map[period]; if (days === undefined) return sales;
    const from = new Date(now); if (period !== "today") from.setDate(from.getDate() - days);
    return sales.filter(s => new Date(s.date) >= from);
  }, [sales, period]);

  const total = filtered.reduce((a, s) => a + s.total, 0);
  const profit = filtered.reduce((a, s) => a + s.profit, 0);

  // Pagination
  const { paged, page, setPage, totalPages, totalItems, pageSize } = usePagination(filtered, 10);

  const productsForVehicle = useMemo(() => {
    if (!form.vehicle || form.vehicle === "all") {
      return products.filter(p => p.quantity > 0);
    }
    return products.filter(p => p.vehicle === form.vehicle && p.quantity > 0);
  }, [form.vehicle, products]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setSelectedPrice(prod.sellPrice);
      setSelectedQty(1);
    }
  };

  const addToCart = () => {
    if (!selectedProduct) {
      toast.error(t("sales.selectProduct"));
      return;
    }
    if (selectedQty <= 0) {
      toast.error(t("toast.qtyMin"));
      return;
    }

    // Check stock
    const alreadyInCart = cart.find(item => item.productId === selectedProduct.id);
    const cartQty = alreadyInCart ? alreadyInCart.qty : 0;
    if (selectedProduct.quantity < cartQty + selectedQty) {
      toast.error(t("toast.stockLeft", { n: selectedProduct.quantity }));
      return;
    }

    if (alreadyInCart) {
      setCart(cart.map(item =>
        item.productId === selectedProduct.id
          ? { ...item, qty: item.qty + selectedQty, price: selectedPrice }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: selectedProduct.id,
        name: selectedProduct.name,
        qty: selectedQty,
        price: selectedPrice,
        buyPrice: selectedProduct.buyPrice,
      }]);
    }

    toast.success(t("sales.cartAdded"));
    setSelectedProductId("");
    setSelectedQty(1);
    setSelectedPrice(0);
  };

  const updateCartQty = (productId: string, delta: number) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;

    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const newQty = item.qty + delta;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.productId !== productId));
      return;
    }

    if (delta > 0 && prod.quantity < newQty) {
      toast.error(`${t("toast.stockInsufficient")}. ${t("toast.stockLeft", { n: prod.quantity })}`);
      return;
    }

    setCart(cart.map(i => i.productId === productId ? { ...i, qty: newQty } : i));
  };

  const openDialog = (m: Mode) => {
    setEditingId(null);
    setMode(m);
    setForm({ ...emptyForm(), paymentType: m === "credit" ? "Qarz" : "Naqd" });
    setCart([]);
    setSelectedProductId("");
    setSelectedQty(1);
    setSelectedPrice(0);
    setOpen(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setMode(s.paymentType === "Qarz" ? "credit" : "cash");
    setForm({
      vehicle: s.vehicle || "",
      discount: s.discount || 0,
      paymentType: s.paymentType,
      customerId: s.customerId || "",
      custName: "",
      custPhone: "",
      custAddress: "",
    });
    
    const cartItems = s.items.map((item: any) => {
      const p = products.find(prod => prod.id === item.productId);
      return {
        productId: item.productId,
        name: p?.name || "Noma'lum tovar",
        qty: item.qty,
        price: item.price,
        buyPrice: item.buyPrice || p?.buyPrice || 0,
      };
    });
    setCart(cartItems);
    setSelectedProductId("");
    setSelectedQty(1);
    setSelectedPrice(0);
    setOpen(true);
  };

  const submit = () => {
    if (cart.length === 0) {
      toast.error(t("sales.cartEmpty"));
      return;
    }

    let customerId: string | null = form.customerId || null;
    if (mode === "credit") {
      if (!customerId) {
        if (!form.custName.trim() || !form.custPhone.trim()) {
          toast.error(t("sales.creditCustomerRequired"));
          return;
        }
        const newId = `cust_${Math.random().toString(36).slice(2, 9)}`;
        addCustomer({
          id: newId,
          name: form.custName.trim(),
          phone: form.custPhone.trim(),
          address: form.custAddress.trim(),
          vehicle: (form.vehicle as any) || (vehicleBrands[0] || ""),
          totalPurchases: 0,
          debt: 0,
        });
        customerId = newId;
      }
    }

    const itemsTotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
    const netTotal = Math.max(0, itemsTotal - form.discount);

    const itemsProfit = cart.reduce((acc, item) => acc + (item.price - item.buyPrice) * item.qty, 0);
    const netProfit = itemsProfit - form.discount;

    // Qarz sotuvda hozir naqd to'langan qism (0 dan netTotal gacha)
    const paidNow = mode === "credit" ? Math.min(Math.max(0, form.paidNow), netTotal) : netTotal;

    if (editingId) {
      updateSale(editingId, {
        customerId,
        items: cart.map(item => ({
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          buyPrice: item.buyPrice,
        })),
        discount: form.discount,
        paymentType: form.paymentType,
        total: netTotal,
        profit: netProfit,
        paid: paidNow,
      });
      toast.success("Sotuv muvaffaqiyatli tahrirlandi");
    } else {
      const newSale = {
        id: `sale_${Math.random().toString(36).slice(2, 9)}`,
        date: new Date().toISOString(),
        customerId,
        sellerId: (employees && employees.find(e => e && e.role === "Sotuvchi")?.id) || (employees && employees[0] ? employees[0].id : ""),
        items: cart.map(item => ({
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          buyPrice: item.buyPrice,
        })),
        discount: form.discount,
        paymentType: form.paymentType,
        total: netTotal,
        profit: netProfit,
        paid: paidNow,
      };

      addSale(newSale);
      toast.success(mode === "credit" ? t("sales.creditAdded") : t("sales.saleAdded"));
      setSelectedSale(newSale);
    }
    
    setOpen(false);
    setCart([]);
    setForm(emptyForm());
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: t("sales.cancelTitle"),
      description: t("sales.cancelDescLong"),
      confirmText: t("common.cancel"),
      cancelText: t("common.back"),
      destructive: true,
    });
    if (ok) {
      deleteSale(id);
      toast.success(t("sales.cancelled"));
    }
  };

  const exportCSV = () => {
    const rows = [[t("common.date"), t("sales.customer"), t("common.product"), t("products.qty"), t("sales.price"), t("common.total"), t("sales.profit"), t("sales.seller"), t("sales.payment")]];
    filtered.forEach(s => {
      const c = s.customerId ? customers.find(x => x.id === s.customerId) : null;
      const e = employees.find(x => x.id === s.sellerId);
      s.items.forEach(i => {
        const p = products.find(x => x.id === i.productId);
        rows.push([
          new Date(s.date).toLocaleDateString("uz-UZ"),
          c?.name || "—", p?.name || "", String(i.qty),
          String(i.price), String(s.total), String(s.profit), e?.name || "", s.paymentType,
        ]);
      });
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sotuvlar.csv"; a.click();
    toast.success(t("sales.csvExported"));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title={t("sales.title")} subtitle={t("sales.subtitle", { n: filtered.length })} actions={
        <>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" onClick={() => openDialog("credit")}>
            <CreditCard className="h-4 w-4 mr-1" />{t("sales.creditSale")}
          </Button>
          <Button onClick={() => openDialog("cash")}><Plus className="h-4 w-4 mr-1" />{t("sales.new")}</Button>
        </>
      } />

      {/* Main New/Credit Sale Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-6 bg-card border border-border rounded-2xl shadow-elevated">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary animate-pulse" />
              {editingId ? "Sotuvni tahrirlash" : mode === "credit" ? t("sales.creditSale") : t("sales.new")}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
            {/* Left Side: Add Product Form */}
            <div className="lg:col-span-5 space-y-4 lg:border-r lg:pr-6 border-border/60">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary/80">{t("sales.addProduct")}</h3>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">{t("sales.vehicleModel")}</Label>
                  <Select value={form.vehicle} onValueChange={(v) => setForm({ ...form, vehicle: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t("common.allModels")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allModels")}</SelectItem>
                      {vehicleBrands.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">{t("common.product")} *</Label>
                  <div className="mt-1">
                    <Popover open={productComboOpen} onOpenChange={setProductComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={productComboOpen}
                          className="w-full justify-between font-normal text-left"
                        >
                          <span className="truncate">
                            {selectedProduct
                              ? `${selectedProduct.name} (Omborda: ${selectedProduct.quantity} ta)`
                              : t("sales.searchProduct")}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t("sales.searchProductPh")} />
                          <CommandEmpty>{t("sales.productNotFound")}</CommandEmpty>
                          <CommandGroup>
                            <CommandList className="max-h-[220px]">
                              {productsForVehicle.length === 0 && (
                                <div className="px-2 py-3 text-sm text-muted-foreground text-center">{t("sales.noStockProduct")}</div>
                              )}
                              {productsForVehicle.map(p => (
                                <CommandItem
                                  key={p.id}
                                  value={`${p.name} ${p.sku}`}
                                  onSelect={() => {
                                    handleProductSelect(p.id);
                                    setProductComboOpen(false);
                                  }}
                                  className="flex justify-between items-start cursor-pointer hover:bg-accent/40"
                                >
                                  <div className="flex items-start gap-2">
                                    <Check className={cn("h-4 w-4 mt-0.5 shrink-0", selectedProductId === p.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span className="font-medium text-sm">{p.name}</span>
                                      <span className="text-[10px] text-muted-foreground">SKU: {p.sku} · Model: {p.vehicle}</span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-semibold block">{formatSom(p.sellPrice)}</span>
                                    <span className="text-[10px] text-muted-foreground">{t("common.inStock", { n: p.quantity })}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">{t("products.qty")}</Label>
                    <Input
                      type="number"
                      min={1}
                      className="mt-1"
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(Math.max(1, +e.target.value))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">{t("sales.sellPrice")}</Label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={selectedPrice}
                      onChange={(e) => setSelectedPrice(Math.max(0, +e.target.value))}
                    />
                  </div>
                </div>

                {selectedProduct && (
                  <div className="bg-muted/40 p-3 rounded-xl text-xs space-y-1.5 border border-border/40 animate-fade-in">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("sales.buyPriceLabel")}</span>
                      <span className="font-semibold">{formatSom(selectedProduct.buyPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("sales.currentStock")}</span>
                      <span className="font-semibold text-primary">{selectedProduct.quantity} {t("common.pcsUnit")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("sales.expectedProfit")}</span>
                      <span className="font-semibold text-success">
                        +{formatSom((selectedPrice - selectedProduct.buyPrice) * selectedQty)}
                      </span>
                    </div>
                  </div>
                )}

                <Button type="button" onClick={addToCart} className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold mt-1">
                  <Plus className="h-4 w-4 mr-1" /> {t("sales.addToCart")}
                </Button>
              </div>
            </div>

            {/* Right Side: Cart, Customers & Checkout */}
            <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Cart list */}
                <div className="rounded-xl border bg-muted/20 overflow-hidden">
                  <div className="px-4 py-2 border-b bg-muted/40 font-semibold text-xs text-muted-foreground uppercase tracking-wider flex justify-between items-center">
                    <span>{t("sales.cartProducts", { n: cart.length })}</span>
                    {cart.length > 0 && (
                      <span className="text-[11px] text-primary normal-case">{t("sales.cartTotal")} {formatSom(cart.reduce((a, c) => a + c.qty * c.price, 0))}</span>
                    )}
                  </div>
                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                      <ShoppingCart className="h-8 w-8 opacity-25" />
                      <span>{t("sales.cartEmptyHint")}</span>
                    </div>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto scrollbar-thin">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground bg-muted/10">
                            <th className="p-2 pl-4">{t("common.product")}</th>
                            <th className="p-2 text-center">{t("common.qtyShort")}</th>
                            <th className="p-2 text-right">{t("common.price")}</th>
                            <th className="p-2 text-right">{t("common.total")}</th>
                            <th className="p-2 text-center"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item.productId} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="p-2 pl-4 font-medium max-w-[180px] truncate">{item.name}</td>
                              <td className="p-2">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => updateCartQty(item.productId, -1)}
                                    className="h-5 w-5 rounded-md border bg-card flex items-center justify-center text-xs hover:bg-muted font-bold"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-6 text-center font-semibold text-xs tabular-nums">{item.qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateCartQty(item.productId, 1)}
                                    className="h-5 w-5 rounded-md border bg-card flex items-center justify-center text-xs hover:bg-muted font-bold"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                              <td className="p-2 text-right tabular-nums text-xs">{formatSom(item.price)}</td>
                              <td className="p-2 text-right font-semibold tabular-nums text-xs">{formatSom(item.qty * item.price)}</td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setCart(cart.filter(c => c.productId !== item.productId))}
                                  className="text-destructive hover:text-destructive/80 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">{t("sales.discountTotal")}</Label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={form.discount}
                      onChange={(e) => setForm({ ...form, discount: Math.max(0, +e.target.value) })}
                    />
                  </div>
                  {mode === "cash" && (
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">{t("sales.payment")}</Label>
                      <Select value={form.paymentType} onValueChange={(v) => setForm({ ...form, paymentType: v as any })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{(["Naqd", "Karta"] as const).map(p => <SelectItem key={p} value={p}>{paymentLabel(t, p)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {mode === "credit" && (
                  <div className="rounded-xl border bg-muted/30 p-3.5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                      <UserPlus className="h-4 w-4" /> {t("sales.creditCustomer")}
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("sales.selectCustomer")}</Label>
                      <div className="mt-1">
                        <Popover open={custComboOpen} onOpenChange={setCustComboOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={custComboOpen}
                              className="w-full justify-between font-normal text-left"
                            >
                              <span>
                                {form.customerId
                                  ? customers.find(c => c.id === form.customerId)?.name
                                  : t("sales.newCustomerOption")}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[320px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder={t("sales.searchCustomer")} />
                              <CommandEmpty>{t("sales.customerNotFound")}</CommandEmpty>
                              <CommandGroup>
                                <CommandList className="max-h-[180px]">
                                  <CommandItem
                                    onSelect={() => {
                                      setForm({ ...form, customerId: "" });
                                      setCustComboOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", !form.customerId ? "opacity-100" : "opacity-0")} />
                                    <span>{t("sales.newCustomerOption")}</span>
                                  </CommandItem>
                                  {customers.map((c) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.name}
                                      onSelect={() => {
                                        setForm({ ...form, customerId: c.id });
                                        setCustComboOpen(false);
                                      }}
                                      className="flex items-center justify-between cursor-pointer"
                                    >
                                      <div className="flex items-center">
                                        <Check className={cn("mr-2 h-4 w-4", form.customerId === c.id ? "opacity-100" : "opacity-0")} />
                                        <div className="flex flex-col">
                                          <span className="font-medium text-sm">{c.name}</span>
                                          <span className="text-xs text-muted-foreground">{c.phone}</span>
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    {!form.customerId && (
                      <div className="grid grid-cols-2 gap-2 mt-2 animate-fade-in">
                        <div className="col-span-2">
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("crm.name")} *</Label>
                          <Input className="mt-1 h-8" value={form.custName} onChange={(e) => setForm({ ...form, custName: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("crm.phone")} *</Label>
                          <Input className="mt-1 h-8" value={form.custPhone} onChange={(e) => setForm({ ...form, custPhone: e.target.value })} placeholder="+998 90 123 45 67" />
                        </div>
                        <div>
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase">{t("crm.address")}</Label>
                          <Input className="mt-1 h-8" value={form.custAddress} onChange={(e) => setForm({ ...form, custAddress: e.target.value })} />
                        </div>
                      </div>
                    )}
                    {form.customerId && (() => {
                      const c = customers.find(x => x.id === form.customerId);
                      if (!c) return null;
                      return (
                        <div className="text-xs text-muted-foreground space-y-1 bg-background/50 p-2.5 rounded-lg border border-border/60 animate-fade-in">
                          <div>📞 {t("sales.phoneLabel")} <span className="font-medium text-foreground">{c.phone}</span></div>
                          <div>📍 {t("sales.addressLabel")} <span className="font-medium text-foreground">{c.address || "—"}</span></div>
                          <div>{t("sales.existingDebt")} <span className="font-bold text-destructive">{formatSom(c.debt)}</span></div>
                        </div>
                      );
                    })()}

                    <div className="border-t border-border/60 pt-3">
                      <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Hozir naqd to'lanadi (qisman)</Label>
                      <Input
                        type="number"
                        min={0}
                        className="mt-1 h-9"
                        value={form.paidNow}
                        onChange={(e) => setForm({ ...form, paidNow: Math.max(0, +e.target.value) })}
                        placeholder="0"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Bo'sh qoldirilsa — to'liq qarzga yoziladi.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout details Card */}
              <div className="space-y-4 pt-4">
                <div className="rounded-xl bg-primary/5 p-4 border border-primary/20 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("sales.subtotalItems", { n: cart.reduce((a, c) => a + c.qty, 0) })}</span>
                    <span className="font-semibold tabular-nums text-foreground">{formatSom(cart.reduce((acc, item) => acc + item.qty * item.price, 0))}</span>
                  </div>
                  {form.discount > 0 && (
                    <div className="flex justify-between text-xs text-destructive">
                      <span>{t("sales.discountLabel")}</span>
                      <span className="font-semibold tabular-nums">-{formatSom(form.discount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="text-sm font-bold text-muted-foreground">{t("sales.totalPayment")}</span>
                    <span className="text-xl font-bold text-primary tabular-nums">
                      {formatSom(Math.max(0, cart.reduce((acc, item) => acc + item.qty * item.price, 0) - form.discount))}
                    </span>
                  </div>
                  {mode === "credit" && (() => {
                    const net = Math.max(0, cart.reduce((acc, item) => acc + item.qty * item.price, 0) - form.discount);
                    const paid = Math.min(Math.max(0, form.paidNow), net);
                    const remaining = net - paid;
                    return (
                      <div className="border-t pt-2 space-y-1">
                        <div className="flex justify-between text-xs text-success">
                          <span>Hozir to'lanadi (naqd):</span>
                          <span className="font-semibold tabular-nums">{formatSom(paid)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-destructive">
                          <span>Qarzga qoladi:</span>
                          <span className="tabular-nums">{formatSom(remaining)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>{t("common.back")}</Button>
                  <Button onClick={submit} disabled={cart.length === 0}>
                    {mode === "credit" ? t("sales.creditSale") : t("sales.saveSale")}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Preview Dialog */}
      {selectedSale && (
        <Dialog open={!!selectedSale} onOpenChange={(open) => { if (!open) setSelectedSale(null); }}>
          <DialogContent className="max-w-md p-6 bg-card border rounded-2xl shadow-elevated">
            <DialogHeader>
              <DialogTitle className="text-center font-bold text-xl tracking-tight">{t("sales.receiptTitle")}</DialogTitle>
            </DialogHeader>

            {/* Receipt container styled for preview and target for printing */}
            <div id="print-area" className="p-5 bg-white text-black font-mono text-xs space-y-4 rounded-xl border border-dashed border-gray-300 shadow-sm">
              <div className="text-center space-y-1">
                <h2 className="text-base font-bold tracking-wider">AUTOOERP PRO</h2>
                <p className="text-[10px] text-gray-500">{t("sales.receiptShop")}</p>
                <p className="text-[10px]">{t("sales.receiptCity")}</p>
              </div>

              <div className="border-t border-dashed border-gray-300 my-2" />

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>{t("sales.receiptNo")}</span>
                  <span className="font-bold">{selectedSale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("common.date")}:</span>
                  <span>{new Date(selectedSale.date).toLocaleString("uz-UZ")}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("sales.seller")}:</span>
                  <span>{employees.find(e => e.id === selectedSale.sellerId)?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("sales.customer")}:</span>
                  <span className="font-bold">
                    {customers.find(c => c.id === selectedSale.customerId)?.name || t("sales.generalCustomer")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t("sales.payment")}:</span>
                  <span className="font-semibold">{paymentLabel(t, selectedSale.paymentType)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 my-2" />

              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-dashed border-gray-300 font-bold">
                    <th className="py-1">{t("common.product")}</th>
                    <th className="text-right py-1">{t("common.qtyShort")}</th>
                    <th className="text-right py-1">{t("common.price")}</th>
                    <th className="text-right py-1">{t("common.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSale.items.map((item: any, idx: number) => {
                    const p = products.find(x => x.id === item.productId);
                    return (
                      <tr key={idx} className="border-b border-dashed border-gray-200">
                        <td className="py-1.5 pr-2 max-w-[130px] truncate">{p?.name || t("sales.unknownProduct")}</td>
                        <td className="text-right py-1.5">{item.qty}</td>
                        <td className="text-right py-1.5">{formatSom(item.price)}</td>
                        <td className="text-right py-1.5 font-semibold">{formatSom(item.qty * item.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-300 my-2" />

              <div className="space-y-1.5 text-right">
                <div className="flex justify-between">
                  <span>{t("sales.subtotal")}:</span>
                  <span>
                    {formatSom(
                      selectedSale.items.reduce((acc: number, item: any) => acc + item.qty * item.price, 0)
                    )}
                  </span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>{t("sales.discount")}:</span>
                    <span>-{formatSom(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-dashed border-gray-300 pt-1">
                  <span>{t("sales.totalPayment")}</span>
                  <span>{formatSom(selectedSale.total)}</span>
                </div>
                {selectedSale.paymentType === "Qarz" && (
                  <>
                    <div className="flex justify-between">
                      <span>To'landi (naqd):</span>
                      <span>{formatSom(selectedSale.paid || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-600">
                      <span>Qarz qoldi:</span>
                      <span>{formatSom(Math.max(0, selectedSale.total - (selectedSale.paid || 0)))}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="text-center text-[9px] text-gray-500 leading-relaxed pt-1">
                {t("sales.thanks")} <br />
                {t("sales.warranty")}
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end flex-wrap">
              <Button variant="outline" onClick={() => setSelectedSale(null)}>{t("common.close")}</Button>
              <Button
                variant="secondary"
                onClick={() =>
                  downloadSaleReceiptPdf(selectedSale, {
                    products,
                    customers,
                    employees,
                    labels: {
                      receipt: t("sales.receipt"),
                      total: t("sales.total"),
                      discount: t("sales.discount"),
                      subtotal: t("sales.subtotal"),
                      thanks: t("sales.thanks"),
                      warranty: t("sales.warranty"),
                    },
                  })
                }
              >
                <FileDown className="mr-2 h-4 w-4" /> {t("sales.receiptPdf")}
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> {t("common.print")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog from hook */}
      {confirmNode}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label={t("sales.totalSales")} value={formatSom(total)} icon={ShoppingCart} accent="primary" />
        <StatCard label={t("sales.netProfit")} value={formatSom(profit)} icon={TrendingUp} accent="success" />
        <StatCard label={t("sales.txCount")} value={String(filtered.length)} icon={ShoppingCart} accent="info" />
      </div>

      <Card className="p-5 rounded-2xl card-elevated border-border/60">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-lg">{t("sales.transactions")}</h3>
            <p className="text-xs text-muted-foreground">{t("sales.transactionsDesc")}</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="today">{t("common.today")}</SelectItem>
              <SelectItem value="week">{t("common.week")}</SelectItem>
              <SelectItem value="month">{t("common.month")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("sales.customer")}</TableHead>
                <TableHead>{t("common.product")}</TableHead>
                <TableHead className="text-right">{t("products.qty")}</TableHead>
                <TableHead className="text-right">{t("sales.price")}</TableHead>
                <TableHead className="text-right">{t("common.total")}</TableHead>
                <TableHead className="text-right">{t("sales.profit")}</TableHead>
                <TableHead>{t("sales.payment")}</TableHead>
                <TableHead className="text-right pr-4">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    {t("sales.notFound")}
                  </TableCell>
                </TableRow>
              ) : (
                paged.map(s => {
                  const c = s.customerId ? customers.find(x => x.id === s.customerId) : null;
                  const firstItem = s.items[0];
                  const firstProduct = firstItem ? products.find(x => x.id === firstItem.productId) : null;
                  const otherItemsCount = s.items.length - 1;
                  const totalQty = s.items.reduce((acc, item) => acc + item.qty, 0);

                  return (
                    <TableRow
                      key={s.id}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedSale(s)}
                    >
                      <TableCell className="text-sm font-medium tabular-nums">
                        {new Date(s.date).toLocaleDateString("uz-UZ")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {c?.name || <span className="text-muted-foreground font-normal">{t("sales.generalCustomer")}</span>}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{firstProduct?.name || t("sales.unknownProduct")}</span>
                          {otherItemsCount > 0 && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {t("sales.moreItems", { n: otherItemsCount })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="flex flex-col items-end">
                          <span className="font-semibold">{totalQty} {t("common.pcsUnit")}</span>
                          {s.items.length > 1 && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {t("sales.itemsKinds", { n: s.items.length })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                        {s.items.length === 1 ? (
                          formatSom(firstItem!.price)
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold text-foreground">
                        {formatSom(s.total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-success">
                        +{formatSom(s.profit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.paymentType === "Qarz" ? "destructive" : "secondary"}>
                          {paymentLabel(t, s.paymentType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedSale(s)}
                            title={t("sales.viewReceipt")}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(s)}
                            title="Tahrirlash"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(s.id)}
                            title={t("sales.deleteTitle")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <PaginationBar page={page} setPage={setPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} />
      </Card>
    </div>
  );
}
