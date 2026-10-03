import { useMemo, useState } from "react";
import { CreditCard, Download, Edit, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  PaginationBar,
  StatCard,
  useConfirm,
  usePagination,
} from "@/components/ui-kit";
import { formatSom } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { paymentLabel } from "@/lib/i18n/helpers";
import { useStore } from "@/lib/store";
import { customersApi } from "@/lib/api";
import type { Sale } from "@/lib/types";
import { toast } from "sonner";

export function SalesPage() {
  const t = useT();
  const {
    sales,
    products,
    customers,
    employees,
    categories,
    vehicleBrands,
    addSale,
    updateSale,
    deleteSale,
  } = useStore();
  const { confirm, confirmNode } = useConfirm();
  const [period, setPeriod] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "Naqd" | "Karta" | "Qarz">("all");
  const [open, setOpen] = useState(false);
  const [debtOpen, setDebtOpen] = useState(false);
  const [debtCustomerName, setDebtCustomerName] = useState("");
  const [debtCustomerAddress, setDebtCustomerAddress] = useState("");
  const [debtCustomerPhone, setDebtCustomerPhone] = useState("");
  const [debtProductId, setDebtProductId] = useState("");
  const [debtQuantity, setDebtQuantity] = useState(1);
  const [debtPaidNow, setDebtPaidNow] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [vehicleBrand, setVehicleBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState<"Naqd" | "Karta" | "Qarz">("Naqd");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const availableProducts = useMemo(() => {
    return products.filter((product) => {
      const matchVeh =
        vehicleBrand === "all" ||
        product.vehicle === vehicleBrand ||
        (product.vehicles && product.vehicles.includes(vehicleBrand)) ||
        (product.vehicle && product.vehicle.includes(vehicleBrand)) ||
        product.vehicle === "Barchasi";
      const matchCat = category === "all" || product.category === category;
      return matchVeh && matchCat;
    });
  }, [products, vehicleBrand, category]);

  const filtered = useMemo(() => {
    const paymentSales =
      paymentFilter === "all" ? sales : sales.filter((sale) => sale.paymentType === paymentFilter);
    if (period === "all") return paymentSales;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const daysMap: Record<string, number> = { today: 0, week: 7, month: 30 };
    const days = daysMap[period];
    if (days === undefined) return paymentSales;
    const from = new Date(now);
    if (period !== "today") from.setDate(from.getDate() - days);
    return paymentSales.filter((sale) => new Date(sale.date) >= from);
  }, [period, paymentFilter, sales]);

  const { paged, page, setPage, totalPages, totalItems, pageSize } = usePagination(filtered, 10);
  const total = filtered.reduce((sum, sale) => sum + sale.total, 0);
  const profit = filtered.reduce((sum, sale) => sum + sale.profit, 0);

  const submit = async () => {
    if (!productId) {
      toast.error(t("sales.selectProduct"));
      return;
    }

    const product = products.find((item) => item.id === productId);
    if (!product) {
      toast.error(t("sales.productNotFound"));
      return;
    }

    if (qty <= 0) {
      toast.error(t("toast.qtyMin"));
      return;
    }

    const nextTotal = qty * price - discount;
    let customerId: string | null = null;
    if (paymentType === "Qarz") {
      const name = customerName.trim();
      const phone = customerPhone.trim();
      if (!name || !phone) {
        toast.error("Qarz uchun mijozning ism-familiyasi va telefon raqami kerak");
        return;
      }

      const phoneDigits = phone.replace(/\D/g, "");
      const existingCustomer = customers.find(
        (customer) => customer.phone.replace(/\D/g, "") === phoneDigits,
      );
      try {
        if (existingCustomer) {
          customerId = existingCustomer.id;
          if (existingCustomer.name !== name || existingCustomer.phone !== phone) {
            const updatedCustomer = await customersApi.update(existingCustomer.id, { name, phone });
            useStore.setState((state) => ({
              customers: state.customers.map((customer) =>
                customer.id === existingCustomer.id ? updatedCustomer : customer,
              ),
            }));
          }
        } else {
          const newCustomer = await customersApi.create({
            id: `cus_${Math.random().toString(36).slice(2, 9)}`,
            name,
            phone,
            address: "",
            vehicle: "",
            totalPurchases: 0,
            debt: 0,
          });
          customerId = newCustomer.id;
          useStore.setState((state) => ({ customers: [newCustomer, ...state.customers] }));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Mijozni saqlab bo'lmadi");
        return;
      }
    }

    const payload: Sale = {
      id: editingId || `sale_${Math.random().toString(36).slice(2, 9)}`,
      date: new Date().toISOString(),
      customerId,
      sellerId: employees.find((item) => item.role === "Sotuvchi")?.id || employees[0]?.id || "",
      items: [{ productId, qty, price, buyPrice: product.buyPrice }],
      discount,
      paymentType,
      total: nextTotal,
      profit: (price - product.buyPrice) * qty - discount,
      paid: paymentType === "Qarz" ? 0 : nextTotal,
    };

    if (editingId) {
      updateSale(editingId, payload);
      toast.success("Sotuv yangilandi");
    } else {
      addSale(payload);
      toast.success(t("sales.saleAdded"));
    }

    resetForm();
  };

  const submitDebt = async () => {
    const name = debtCustomerName.trim();
    const address = debtCustomerAddress.trim();
    const phone = debtCustomerPhone.trim();
    const product = products.find((item) => item.id === debtProductId);
    if (!name || !address || !phone || !product) {
      toast.error(t("sales.debtRequiredFields"));
      return;
    }
    if (!Number.isInteger(debtQuantity) || debtQuantity < 1) {
      toast.error(t("toast.qtyMin"));
      return;
    }
    const total = product.sellPrice * debtQuantity;
    if (!Number.isFinite(debtPaidNow) || debtPaidNow < 0 || debtPaidNow > total) {
      toast.error(t("sales.paidAmountInvalid"));
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");
    const existingCustomer = customers.find(
      (customer) => customer.phone.replace(/\D/g, "") === phoneDigits,
    );
    let customerId: string;
    try {
      if (existingCustomer) {
        customerId = existingCustomer.id;
        if (
          existingCustomer.name !== name ||
          existingCustomer.phone !== phone ||
          existingCustomer.address !== address
        ) {
          const updatedCustomer = await customersApi.update(existingCustomer.id, {
            name,
            phone,
            address,
          });
          useStore.setState((state) => ({
            customers: state.customers.map((customer) =>
              customer.id === existingCustomer.id ? updatedCustomer : customer,
            ),
          }));
        }
      } else {
        const newCustomer = await customersApi.create({
          id: `cus_${Math.random().toString(36).slice(2, 9)}`,
          name,
          phone,
          address,
          vehicle: product.vehicle,
          totalPurchases: 0,
          debt: 0,
        });
        customerId = newCustomer.id;
        useStore.setState((state) => ({ customers: [newCustomer, ...state.customers] }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("sales.customerSaveFailed"));
      return;
    }

    const debtSale: Sale = {
      id: `sale_${Math.random().toString(36).slice(2, 9)}`,
      date: new Date().toISOString(),
      customerId,
      sellerId: employees.find((item) => item.role === "Sotuvchi")?.id || employees[0]?.id || "",
      items: [
        {
          productId: product.id,
          productName: product.name,
          qty: debtQuantity,
          price: product.sellPrice,
          buyPrice: product.buyPrice,
        },
      ],
      discount: 0,
      paymentType: "Qarz",
      total,
      profit: (product.sellPrice - product.buyPrice) * debtQuantity,
      paid: debtPaidNow,
    };
    addSale(debtSale);
    toast.success(t("sales.creditAdded"));
    setDebtOpen(false);
    setDebtCustomerName("");
    setDebtCustomerAddress("");
    setDebtCustomerPhone("");
    setDebtProductId("");
    setDebtQuantity(1);
    setDebtPaidNow(0);
  };

  const resetForm = () => {
    setOpen(false);
    setEditingId(null);
    setVehicleBrand("all");
    setCategory("all");
    setProductId("");
    setQty(1);
    setPrice(0);
    setDiscount(0);
    setPaymentType("Naqd");
    setCustomerName("");
    setCustomerPhone("");
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

  const exportCsv = () => {
    const rows = [
      [
        t("common.date"),
        t("sales.customer"),
        t("common.product"),
        t("products.qty"),
        t("sales.price"),
        t("common.total"),
      ],
    ];
    filtered.forEach((sale) => {
      const names = sale.items
        .map((item) => products.find((product) => product.id === item.productId)?.name || "")
        .join(" | ");
      rows.push([
        new Date(sale.date).toLocaleDateString("uz-UZ"),
        customers.find((customer) => customer.id === sale.customerId)?.name || "—",
        names,
        String(sale.items.reduce((sum, item) => sum + item.qty, 0)),
        String(sale.total),
        String(sale.total),
      ]);
    });

    const blob = new Blob(
      ["\uFEFF" + rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sotuvlar.csv";
    link.click();
    toast.success(t("sales.csvExported"));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title={t("sales.title")}
        subtitle={t("sales.subtitle", { n: filtered.length })}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => setDebtOpen(true)}>
              <CreditCard className="h-4 w-4 mr-1" />
              {t("sales.addDebt")}
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("sales.new")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label={t("sales.totalSales")}
          value={formatSom(total)}
          icon={ShoppingCart}
          accent="primary"
        />
        <StatCard
          label={t("sales.netProfit")}
          value={formatSom(profit)}
          icon={CreditCard}
          accent="success"
        />
        <StatCard
          label={t("sales.txCount")}
          value={String(filtered.length)}
          icon={ShoppingCart}
          accent="info"
        />
      </div>

      <Card className="p-5 rounded-2xl card-elevated border-border/60">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-lg">{t("sales.transactions")}</h3>
            <p className="text-xs text-muted-foreground">{t("sales.transactionsDesc")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="today">{t("common.today")}</SelectItem>
                <SelectItem value="week">{t("common.week")}</SelectItem>
                <SelectItem value="month">{t("common.month")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={paymentFilter}
              onValueChange={(value) =>
                setPaymentFilter(value as "all" | "Naqd" | "Karta" | "Qarz")
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("sales.allPaymentTypes")}</SelectItem>
                <SelectItem value="Naqd">{paymentLabel(t, "Naqd")}</SelectItem>
                <SelectItem value="Karta">{paymentLabel(t, "Karta")}</SelectItem>
                <SelectItem value="Qarz">{paymentLabel(t, "Qarz")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                <TableHead className="text-right">{t("sales.discount")}</TableHead>
                <TableHead className="text-right">{t("common.total")}</TableHead>
                <TableHead className="text-right">{t("sales.paidTotal")}</TableHead>
                <TableHead className="text-right">{t("sales.remainingDebt")}</TableHead>
                <TableHead>{t("sales.payment")}</TableHead>
                <TableHead className="text-right pr-4">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                    {t("sales.notFound")}
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-muted/40">
                    <TableCell>{new Date(sale.date).toLocaleDateString("uz-UZ")}</TableCell>
                    <TableCell>
                      {(() => {
                        const customer = customers.find((item) => item.id === sale.customerId);
                        return customer ? (
                          <>
                            <div>{customer.name}</div>
                            {customer.phone && (
                              <div className="text-xs text-muted-foreground">{customer.phone}</div>
                            )}
                          </>
                        ) : (
                          t("sales.generalCustomer")
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-40 flex-col gap-1.5">
                        {sale.items.map((item, index) => {
                          const p = products.find((product) => product.id === item.productId);
                          const productName = p?.name || item.productName || t("sales.unknownProduct");
                          const vehicleLabel = p?.vehicle || "";
                          return (
                            <div
                              key={`${sale.id}-${item.productId}-${index}`}
                              className="flex items-center gap-1.5 flex-wrap"
                            >
                              {vehicleLabel && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-normal bg-muted/60 shrink-0"
                                >
                                  {vehicleLabel}
                                </Badge>
                              )}
                              <span className="font-medium">{productName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="flex flex-col gap-1">
                        {sale.items.map((item, index) => (
                          <span key={`${sale.id}-qty-${index}`}>{item.qty}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="flex flex-col gap-1">
                        {sale.items.map((item, index) => (
                          <span key={`${sale.id}-price-${index}`}>{formatSom(item.price)}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatSom(sale.discount)}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {formatSom(sale.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatSom(sale.paymentType === "Qarz" ? sale.paid || 0 : sale.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatSom(
                        sale.paymentType === "Qarz"
                          ? Math.max(0, sale.total - (sale.paid || 0))
                          : 0,
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sale.paymentType === "Qarz" ? "destructive" : "secondary"}>
                        {paymentLabel(t, sale.paymentType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingId(sale.id);
                            const saleProduct = products.find(
                              (product) => product.id === sale.items[0]?.productId,
                            );
                            setVehicleBrand("all");
                            setCategory(saleProduct?.category || "all");
                            setProductId(sale.items[0]?.productId || "");
                            setQty(sale.items[0]?.qty || 1);
                            setPrice(sale.items[0]?.price || 0);
                            setDiscount(sale.discount || 0);
                            setPaymentType(sale.paymentType as "Naqd" | "Karta" | "Qarz");
                            const customer = customers.find((item) => item.id === sale.customerId);
                            setCustomerName(customer?.name || "");
                            setCustomerPhone(customer?.phone || "");
                            setOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sale.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <PaginationBar
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Sotuvni tahrirlash" : t("sales.new")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Avtomobil (Mashina brendi)</Label>
              <Select
                value={vehicleBrand}
                onValueChange={(value) => {
                  setVehicleBrand(value);
                  setProductId("");
                  setPrice(0);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Barcha mashinalar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha mashinalar</SelectItem>
                  {vehicleBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("products.category")}</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value);
                  setProductId("");
                  setPrice(0);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Barcha kategoriyalar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha kategoriyalar</SelectItem>
                  {categories.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("common.product")}</Label>
              <Select
                value={productId}
                onValueChange={(value) => {
                  setProductId(value);
                  const selectedProduct = availableProducts.find((item) => item.id === value);
                  setPrice(selectedProduct?.sellPrice || 0);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("sales.searchProduct")} />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      [{product.vehicle || "Universal"}] {product.name} — {formatSom(product.sellPrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("products.qty")}</Label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(event) => setQty(Math.max(1, Number(event.target.value)))}
                />
              </div>
              <div>
                <Label>{t("sales.price")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(event) => setPrice(Math.max(0, Number(event.target.value)))}
                />
              </div>
            </div>
            <div>
              <Label>{t("sales.discountTotal")}</Label>
              <Input
                type="number"
                min={0}
                value={discount}
                onChange={(event) => setDiscount(Math.max(0, Number(event.target.value)))}
              />
            </div>
            <div>
              <Label>{t("sales.payment")}</Label>
              <Select
                value={paymentType}
                onValueChange={(value) => {
                  setPaymentType(value as "Naqd" | "Karta" | "Qarz");
                  if (value !== "Qarz") {
                    setCustomerName("");
                    setCustomerPhone("");
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Naqd">{paymentLabel(t, "Naqd")}</SelectItem>
                  <SelectItem value="Karta">{paymentLabel(t, "Karta")}</SelectItem>
                  {editingId && paymentType === "Qarz" && (
                    <SelectItem value="Qarz">{paymentLabel(t, "Qarz")}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {paymentType === "Qarz" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Ism-familiyasi</Label>
                  <Input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Mijozning ism-familiyasi"
                  />
                </div>
                <div>
                  <Label>{t("common.phone")}</Label>
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="+998 ..."
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.back")}
            </Button>
            <Button onClick={submit}>{editingId ? "Saqlash" : t("sales.saveSale")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={debtOpen} onOpenChange={setDebtOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("sales.addDebt")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>{t("common.nameStar")}</Label>
              <Input
                value={debtCustomerName}
                onChange={(event) => setDebtCustomerName(event.target.value)}
                placeholder={t("sales.customerFullName")}
              />
            </div>
            <div>
              <Label>{t("common.phone")}</Label>
              <Input
                type="tel"
                value={debtCustomerPhone}
                onChange={(event) => setDebtCustomerPhone(event.target.value)}
                placeholder="+998 ..."
              />
            </div>
            <div className="sm:col-span-2">
              <Label>{t("common.address")}</Label>
              <Input
                value={debtCustomerAddress}
                onChange={(event) => setDebtCustomerAddress(event.target.value)}
                placeholder={t("sales.customerAddress")}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>{t("common.product")}</Label>
              <Select value={debtProductId} onValueChange={setDebtProductId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("sales.searchProduct")} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      [{product.vehicle || "Universal"}] {product.name} · {product.quantity}{" "}
                      {t("products.qty").toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("products.qty")}</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={debtQuantity}
                onChange={(event) => setDebtQuantity(Number(event.target.value))}
              />
            </div>
            {debtProductId && (
              <div className="flex flex-col justify-center text-sm text-muted-foreground">
                <span className="flex gap-1">
                  <span>{t("sales.unitPrice")}:</span>
                  <span>
                    {formatSom(products.find((p) => p.id === debtProductId)?.sellPrice || 0)}
                  </span>
                </span>
                <span className="flex gap-1">
                  <span>{t("common.total")}:</span>
                  <span>
                    {formatSom(
                      (products.find((p) => p.id === debtProductId)?.sellPrice || 0) * debtQuantity,
                    )}
                  </span>
                </span>
              </div>
            )}
            {debtProductId && (
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>{t("sales.paidNow")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={debtPaidNow}
                    onChange={(event) => setDebtPaidNow(Number(event.target.value))}
                  />
                </div>
                <div className="flex flex-col justify-center text-sm">
                  <span className="text-muted-foreground">{t("sales.remainingDebt")}</span>
                  <span className="font-semibold">
                    {formatSom(
                      Math.max(
                        0,
                        (products.find((p) => p.id === debtProductId)?.sellPrice || 0) *
                          debtQuantity -
                          debtPaidNow,
                      ),
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDebtOpen(false)}>
              {t("common.back")}
            </Button>
            <Button onClick={submitDebt}>{t("sales.saveDebt")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {confirmNode}
    </div>
  );
}
