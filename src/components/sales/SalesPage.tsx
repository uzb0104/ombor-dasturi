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
  const { sales, products, customers, employees, categories, addSale, updateSale, deleteSale } =
    useStore();
  const { confirm, confirmNode } = useConfirm();
  const [period, setPeriod] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState(categories[0] || "");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState<"Naqd" | "Karta" | "Qarz">("Naqd");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const categoryProducts = useMemo(
    () => products.filter((product) => product.category === category),
    [products, category],
  );

  const filtered = useMemo(() => {
    if (period === "all") return sales;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const daysMap: Record<string, number> = { today: 0, week: 7, month: 30 };
    const days = daysMap[period];
    if (days === undefined) return sales;
    const from = new Date(now);
    if (period !== "today") from.setDate(from.getDate() - days);
    return sales.filter((sale) => new Date(sale.date) >= from);
  }, [period, sales]);

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

  const resetForm = () => {
    setOpen(false);
    setEditingId(null);
    setCategory(categories[0] || "");
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
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("sales.customer")}</TableHead>
                <TableHead>{t("common.product")}</TableHead>
                <TableHead className="text-right">{t("common.total")}</TableHead>
                <TableHead>{t("sales.payment")}</TableHead>
                <TableHead className="text-right pr-4">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
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
                      {sale.items
                        .map(
                          (item) =>
                            products.find((product) => product.id === item.productId)?.name || "",
                        )
                        .join(", ")}
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatSom(sale.total)}</TableCell>
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
                            setCategory(saleProduct?.category || categories[0] || "");
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
                  <SelectValue placeholder={t("products.category")} />
                </SelectTrigger>
                <SelectContent>
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
                  const selectedProduct = categoryProducts.find((item) => item.id === value);
                  setPrice(selectedProduct?.sellPrice || 0);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("sales.searchProduct")} />
                </SelectTrigger>
                <SelectContent>
                  {categoryProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
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
                  <SelectItem value="Qarz">{paymentLabel(t, "Qarz")}</SelectItem>
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

      {confirmNode}
    </div>
  );
}
